import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEnv } from '../config/env.js';
import logger from '../utils/logger.js';
import cacheService from './cacheService.js';

export const queryUnderstandingSchema = z.object({
  brand: z.string().nullable().default(null),
  model: z.string().nullable().default(null),
  category: z.string().nullable().default(null),
  specifications: z.object({
    cpu: z.string().nullable().default(null),
    gpu: z.string().nullable().default(null),
    ram: z.string().nullable().default(null),
    storage: z.string().nullable().default(null),
    displaySize: z.string().nullable().default(null),
    color: z.string().nullable().default(null)
  }).default({
    cpu: null,
    gpu: null,
    ram: null,
    storage: null,
    displaySize: null,
    color: null
  }),
  budget: z.object({
    min: z.number().nullable().default(null),
    max: z.number().nullable().default(null),
    currency: z.string().default('INR')
  }).default({
    min: null,
    max: null,
    currency: 'INR'
  }),
  intent: z.enum(['search', 'compare', 'deal_hunt', 'accessory', 'general']).default('search'),
  cleanSearchQuery: z.string().min(1)
});

const KNOWN_BRANDS = [
  'apple', 'samsung', 'sony', 'dell', 'hp', 'lenovo', 'asus', 'acer', 'oneplus',
  'xiaomi', 'realme', 'boat', 'noise', 'lg', 'motorola', 'google', 'nothing',
  'bose', 'sennheiser', 'jbl', 'zebronics', 'boult', 'logitech', 'canon', 'nikon',
  'nike', 'adidas', 'puma', 'zara', 'h&m', 'levis', 'ikea', 'philips'
];

const CATEGORY_KEYWORDS = {
  laptop: ['laptop', 'macbook', 'notebook', 'thinkpad', 'zenbook', 'vivobook', 'ideapad', 'yoga', 'pavilion'],
  smartphone: ['phone', 'smartphone', 'iphone', 'galaxy', 'pixel', 'oneplus', 'redmi', 'realme'],
  headphones: ['headphone', 'headphones', 'earphone', 'earphones', 'earbuds', 'airpods', 'tws'],
  monitor: ['monitor', 'display', 'screen'],
  smartwatch: ['smartwatch', 'watch', 'band', 'fitness tracker'],
  tablet: ['tablet', 'ipad', 'tab'],
  clothing: ['shirt', 'tshirt', 't-shirt', 'jacket', 'hoodie', 'jeans', 'dress', 'clothing', 'shoes', 'sneakers'],
  home: ['furniture', 'chair', 'table', 'desk', 'lamp', 'kitchen', 'home', 'appliance', 'sofa', 'bed']
};

/**
 * Deterministic heuristic query parser as instant baseline and fallback
 */
export function parseQueryHeuristic(rawQuery) {
  const query = rawQuery.trim();
  const lower = query.toLowerCase();

  // 1. Detect Brand
  let detectedBrand = null;
  for (const brand of KNOWN_BRANDS) {
    const regex = new RegExp(`\\b${brand}\\b`, 'i');
    if (regex.test(lower)) {
      detectedBrand = brand.charAt(0).toUpperCase() + brand.slice(1);
      break;
    }
  }

  // 2. Detect Category
  let detectedCategory = null;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      detectedCategory = category;
      break;
    }
  }

  // 3. Detect Budget (e.g., "under 50000", "under 50k", "below 30k")
  let budgetMax = null;
  let budgetMin = null;
  const underMatch = lower.match(/(?:under|below|less than|within)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|lakh|lac)?/i);
  if (underMatch) {
    let num = parseFloat(underMatch[1].replace(/,/g, ''));
    const unit = (underMatch[2] || '').toLowerCase();
    if (unit === 'k') num *= 1000;
    if (unit === 'lakh' || unit === 'lac') num *= 100000;
    budgetMax = num;
  }

  // 4. Detect Specs
  const ramMatch = lower.match(/\b(\d+)\s*(?:gb)\s*(?:ram)?\b/i);
  const storageMatch = lower.match(/\b(\d+)\s*(?:gb|tb)\s*(?:ssd|storage|rom)?\b/i);

  // 5. Detect Intent
  let intent = 'search';
  if (lower.includes('vs') || lower.includes('compare')) intent = 'compare';
  else if (lower.includes('deal') || lower.includes('offer') || lower.includes('discount')) intent = 'deal_hunt';
  else if (lower.includes('case') || lower.includes('cover') || lower.includes('charger') || lower.includes('cable')) intent = 'accessory';

  // 6. Clean Search Query (strip filler words like "under 50k", "best", "cheap")
  const cleanSearchQuery = query
    .replace(/(?:under|below|less than)\s*(?:rs\.?|inr|₹)?\s*\d+(?:,\d+)*(?:\.\d+)?\s*(?:k|lakh|lac)?/gi, '')
    .replace(/\b(best|cheap|cheapest|top|latest)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || query;

  return queryUnderstandingSchema.parse({
    brand: detectedBrand,
    model: null,
    category: detectedCategory,
    specifications: {
      cpu: null,
      gpu: null,
      ram: ramMatch ? `${ramMatch[1]}GB` : null,
      storage: storageMatch ? storageMatch[0].toUpperCase() : null,
      displaySize: null,
      color: null
    },
    budget: {
      min: budgetMin,
      max: budgetMax,
      currency: 'INR'
    },
    intent,
    cleanSearchQuery
  });
}

/**
 * AI-powered query understanding with Gemini 2.5 Flash and heuristic fallback
 * @param {string} rawQuery
 * @returns {Promise<z.infer<typeof queryUnderstandingSchema>>}
 */
export async function understandQuery(rawQuery) {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return parseQueryHeuristic('');
  }

  const cacheKey = `query_understanding:${rawQuery.trim().toLowerCase()}`;
  const cached = await cacheService.get(cacheKey);
  if (cached && cached.value) {
    return cached.value;
  }

  const env = getEnv();
  const heuristicResult = parseQueryHeuristic(rawQuery);

  // Return heuristic immediately (0ms) for typical e-commerce queries (brand/category recognized or short query)
  const wordCount = rawQuery.trim().split(/\s+/).length;
  const isDirectProductQuery = heuristicResult.brand || heuristicResult.category || wordCount <= 4;

  if (isDirectProductQuery || !env.GEMINI_API_KEY || env.USE_MOCK_DATA === 'true') {
    await cacheService.set(cacheKey, heuristicResult, { ttlSeconds: 86400 });
    return heuristicResult;
  }

  // Attempt Gemini with a tight 1200ms timeout for long unstructured conversational queries
  try {
    const aiPromise = (async () => {
      const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const prompt = `Analyze this product search query from an Indian e-commerce shopper: "${rawQuery}".
Extract structured data into JSON matching this exact schema:
{
  "brand": string or null,
  "model": string or null,
  "category": "laptop" | "smartphone" | "headphones" | "monitor" | "smartwatch" | "tablet" | "clothing" | "home" | "electronics" | null,
  "specifications": {
    "cpu": string or null,
    "gpu": string or null,
    "ram": string or null,
    "storage": string or null,
    "displaySize": string or null,
    "color": string or null
  },
  "budget": {
    "min": number or null,
    "max": number or null (in INR e.g. 50k = 50000),
    "currency": "INR"
  },
  "intent": "search" | "compare" | "deal_hunt" | "accessory" | "general",
  "cleanSearchQuery": string (optimized query string stripped of filler words like 'best', 'under 50k')
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const parsedJson = JSON.parse(text);
      return queryUnderstandingSchema.parse(parsedJson);
    })();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini query understanding timeout (1200ms)')), 1200)
    );

    const validatedResult = await Promise.race([aiPromise, timeoutPromise]);
    await cacheService.set(cacheKey, validatedResult, { ttlSeconds: 86400 });
    return validatedResult;
  } catch (err) {
    logger.warn({ error: err.message, query: rawQuery }, 'Query understanding fell back to heuristics');
    await cacheService.set(cacheKey, heuristicResult, { ttlSeconds: 86400 });
    return heuristicResult;
  }
}

export default { understandQuery, parseQueryHeuristic, queryUnderstandingSchema };
