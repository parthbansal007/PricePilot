import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import PriceHistory from '../models/PriceHistory.js';
import Budget from '../models/Budget.js';
import Expense from '../models/Expense.js';
import { getProductDetails } from './productService.js';
import { calculateSmartBuyScore } from './smartBuyScoreService.js';
import logger from '../utils/logger.js';

const adviceOutputSchema = z.object({
  recommendation: z.enum(['BUY_NOW', 'BUY', 'WAIT', 'CONSIDER']).default('CONSIDER'),
  smartBuyScore: z.number().min(0).max(100).default(50),
  explanation: z.string().min(1),
  priceAssessment: z.string().default(''),
  trendAssessment: z.string().default(''),
  budgetAssessment: z.string().default(''),
  caution: z.string().default(''),
  alternatives: z.array(z.any()).default([])
});

/**
 * Calculate Smart Buy Score V2 and statistics
 */
export const calculatePriceStatistics = async (productId, currentPrice, budget, remainingBudget, mrp = null) => {
  // Query by productId or canonicalProductId
  const history = await PriceHistory.find({
    $or: [
      { productId },
      { canonicalProductId: productId }
    ]
  }).sort({ timestamp: 1 }).lean();

  const scoreResult = calculateSmartBuyScore({
    currentPrice,
    mrp,
    history,
    budget,
    remainingBudget
  });

  return {
    ...scoreResult,
    // Backwards-compatible aliases for legacy callers
    historicalAverage: scoreResult.percentiles.p50,
    lowest: scoreResult.percentiles.lowest,
    highest: scoreResult.percentiles.highest,
    trend: scoreResult.trendAssessment,
    priceDrop: Math.max(0, scoreResult.percentiles.highest - currentPrice)
  };
};

export const getAIAdvice = async (message, productId, userId) => {
  let productContext = '';
  let budgetContext = '';
  let currentPrice = 0;
  let mrp = null;

  const budget = await Budget.findOne({ userId });
  let remainingBudget = 0;
  let totalSpent = 0;
  if (budget) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const expenses = await Expense.find({
      userId, date: { $gte: startOfMonth }, type: { $in: ['EXPENSE', 'PURCHASE'] }
    });
    totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    remainingBudget = budget.monthlyLimit - totalSpent;
    budgetContext = `User has a monthly budget of ₹${budget.monthlyLimit}. They have spent ₹${totalSpent} and have ₹${remainingBudget} remaining.`;
  }

  let stats = {
    smartBuyScore: 50,
    recommendation: 'CONSIDER',
    confidence: 'INSUFFICIENT',
    insufficientHistory: true,
    percentiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, lowest: 0, highest: 0, currentPercentile: 50 },
    dealHonesty: { score: 100, level: 'HONEST', isFakeDiscount: false, flags: [] },
    breakdown: {},
    dataSources: { totalPoints: 0, backfilledPoints: 0, selfCollectedPoints: 0, historySpanDays: 0 },
    factors: [],
    priceAssessment: '',
    trendAssessment: 'UNKNOWN',
    budgetAssessment: '',
    caution: '',
    historicalAverage: 0,
    lowest: 0,
    highest: 0,
    trend: 'STABLE',
    priceDrop: 0
  };

  if (productId) {
    try {
      const details = await getProductDetails(productId);
      currentPrice = details.price || 0;
      mrp = details.bestOffer?.mrp || details.mrp || null;
      productContext = `Product: ${details.title}. Current price: ₹${currentPrice}.`;
    } catch (_e) {
      productContext = `Product ID: ${productId}. (Details unavailable).`;
    }
    stats = await calculatePriceStatistics(productId, currentPrice, budget, remainingBudget, mrp);
  }

  // Pure deterministic statistical fallback
  const getDeterministicResult = (notice = null) => ({
    recommendation: stats.recommendation,
    smartBuyScore: stats.smartBuyScore,
    confidence: stats.confidence,
    insufficientHistory: stats.insufficientHistory,
    percentiles: stats.percentiles,
    dealHonesty: stats.dealHonesty,
    breakdown: stats.breakdown,
    dataSources: stats.dataSources,
    explanation: notice || `Deterministic Smart Buy Score V2 analysis: ${stats.priceAssessment} ${stats.caution}`,
    factors: stats.factors,
    currentPrice,
    historicalAverage: stats.historicalAverage,
    priceAssessment: stats.priceAssessment,
    trendAssessment: stats.trendAssessment,
    budgetAssessment: budget ? (currentPrice <= remainingBudget ? "Within budget" : "Exceeds budget") : "No budget set",
    caution: stats.caution,
    alternatives: []
  });

  if (!process.env.GEMINI_API_KEY) {
    return getDeterministicResult("AI advisor unavailable (Missing GEMINI_API_KEY). Statistical breakdown only.");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    You are an AI Shopping Assistant named PricePilot. User asks: "${message}"
    Context:
    - Budget: ${budgetContext}
    - Product: ${productContext}
    - Price Assessment: ${stats.priceAssessment}
    - Confidence Tier: ${stats.confidence} (${stats.dataSources.totalPoints} price points across ${stats.dataSources.historySpanDays} days; ${stats.dataSources.backfilledPoints} Keepa backfilled, ${stats.dataSources.selfCollectedPoints} self-collected)
    - Deal Honesty: ${stats.dealHonesty.level} (Flags: ${stats.dealHonesty.flags.join('; ') || 'None'})
    - Calculated Smart Buy Score: ${stats.smartBuyScore}/100
    - Calculated Recommendation: ${stats.recommendation}
    
    Based ONLY on the provided price history facts and budget, provide structured shopping advice.
    DO NOT invent prices or historical data.
    
    Return JSON strictly matching this schema:
    {
      "recommendation": "${stats.recommendation}",
      "smartBuyScore": ${stats.smartBuyScore},
      "explanation": "Concise summary explaining the decision based on historical price rank and deal honesty...",
      "priceAssessment": "Evaluation of current price rank...",
      "trendAssessment": "Evaluation of price trend...",
      "budgetAssessment": "Evaluation of budget fit...",
      "caution": "${stats.caution.replace(/"/g, "'")}",
      "alternatives": []
    }
  `;

  let attempts = 0;
  while (attempts < 2) {
    attempts++;
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });

      let textResponse = result.response.text();
      if (textResponse.startsWith('```json')) {
        textResponse = textResponse.replace(/^```json/, '').replace(/```$/, '').trim();
      }

      const rawJson = JSON.parse(textResponse);
      const parsed = adviceOutputSchema.safeParse(rawJson);

      if (parsed.success) {
        // Crucial Invariant: Gemini must NEVER set or override scores, verdicts, or prices!
        return {
          ...parsed.data,
          recommendation: stats.recommendation, // Deterministically enforced
          smartBuyScore: stats.smartBuyScore,   // Deterministically enforced
          confidence: stats.confidence,
          insufficientHistory: stats.insufficientHistory,
          percentiles: stats.percentiles,
          dealHonesty: stats.dealHonesty,
          breakdown: stats.breakdown,
          dataSources: stats.dataSources,
          factors: stats.factors,
          currentPrice,
          historicalAverage: stats.historicalAverage,
          caution: stats.caution
        };
      } else {
        logger.warn({ attempt: attempts, errors: parsed.error.issues }, 'Gemini advice failed Zod validation; retrying');
      }
    } catch (err) {
      logger.warn({ attempt: attempts, error: err.message }, 'Gemini advice call failed; retrying if attempts left');
    }
  }

  // Graceful deterministic fallback after 1 retry
  logger.warn('Gemini advice generation failed after retry; falling back to deterministic result.');
  return getDeterministicResult("AI advice unavailable. Providing deterministic analysis.");
};

export const explainBetterConfiguration = async (selectedProduct, alternativeProduct, score, reasons, remainingBudget) => {
  if (!process.env.GEMINI_API_KEY) {
    return "This alternative is recommended based on deterministic scoring of price, specifications, and budget fit.";
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    You are PricePilot AI. Explain why the alternative configuration is recommended over the user's selected product.
    Do NOT invent specifications or prices. Use ONLY the provided deterministic facts.
    
    Selected Product: ${selectedProduct.title} (Price: ₹${selectedProduct.currentPrice})
    Alternative Product: ${alternativeProduct.title} (Price: ₹${alternativeProduct.currentPrice})
    Value Score: ${score}/100
    Remaining Budget: ₹${remainingBudget}
    Reasons computed by backend: ${reasons.join(', ')}

    Provide a concise (2-3 sentences) explanation suitable for the UI under the "Why we recommend it" section.
  `;

  let attempts = 0;
  while (attempts < 2) {
    attempts++;
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      if (text && text.length > 5) {
        return text;
      }
    } catch (error) {
      logger.warn({ attempt: attempts, error: error.message }, 'Gemini explanation failed');
    }
  }

  return "Recommended due to a higher value score considering price and specifications.";
};

export default {
  calculatePriceStatistics,
  getAIAdvice,
  explainBetterConfiguration
};
