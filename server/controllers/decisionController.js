import { GoogleGenerativeAI } from '@google/generative-ai';
import { getProductDetails } from '../services/productService.js';
import { calculateEffectivePrice } from '../services/effectivePriceService.js';
import { planAffordability } from '../services/affordabilityService.js';
import { forecastPriceDrop } from '../services/waitForecaster.js';
import { calculateSmartBuyScore } from '../services/smartBuyScoreService.js';
import Wallet from '../models/Wallet.js';
import PriceHistory from '../models/PriceHistory.js';
import { getEnv } from '../config/env.js';
import logger from '../utils/logger.js';

// Indian PIN Code Validation (6 digits, non-zero first digit)
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

function validatePincode(pincode) {
  if (!pincode) return null;
  const cleanPin = String(pincode).trim();
  const isValid = PINCODE_REGEX.test(cleanPin);
  if (!isValid) return { pincode: cleanPin, serviceable: false, estimatedDays: null, error: 'Invalid 6-digit Indian PIN code' };

  // Common tier 1 metro prefixes (11: Delhi, 40: Mumbai, 56: Bengaluru, 60: Chennai, 70: Kolkata, 50: Hyderabad)
  const isMetro = /^(11|40|56|60|70|50)/.test(cleanPin);
  return {
    pincode: cleanPin,
    serviceable: true,
    metro: isMetro,
    estimatedDays: isMetro ? '1-2 days' : '3-5 days'
  };
}

/**
 * Generate AI natural-language executive summary of pre-computed decision object
 */
async function generateNaturalLanguageSummary(decisionData) {
  const env = getEnv();
  if (!env.GEMINI_API_KEY || env.USE_MOCK_DATA === 'true') {
    return decisionData.deterministicSummary;
  }

  try {
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.2 }
    });

    const prompt = `You are the decision engine for PricePilot AI.
Here is the factual purchase decision for the user:
- Product: ${decisionData.productTitle}
- Recommended Verdict: ${decisionData.verdict.decision}
- Best Seller: ${decisionData.bestSeller.retailer} (Listed: ₹${decisionData.bestSeller.listedPrice}, Effective: ₹${decisionData.bestSeller.effectivePrice}, Savings: ₹${decisionData.bestSeller.totalSavings})
- Applied Card: ${decisionData.bestSeller.appliedRule ? decisionData.bestSeller.appliedRule.cardName : 'None'}
- Affordability: ${decisionData.affordability.advice}
- Wait Forecast: ${decisionData.waitForecast.reason}
- Deal Honesty: ${decisionData.smartBuyScore.dealHonesty.level}

Write a clear, concise 2-sentence executive summary advising the user on whether to buy, where from, with which card, and when.
DO NOT change the verdict, prices, or numbers. Respond with ONLY the summary text.`;

    const summaryPromise = (async () => {
      const res = await model.generateContent(prompt);
      return res.response.text().trim();
    })();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini summary timeout')), 2500)
    );

    const result = await Promise.race([summaryPromise, timeoutPromise]);
    return result || decisionData.deterministicSummary;
  } catch (err) {
    logger.debug({ error: err.message }, 'Gemini decision summary failed; using deterministic summary');
    return decisionData.deterministicSummary;
  }
}

/**
 * Core personal decision calculator reusable across REST and AI Agent
 */
export async function calculatePersonalDecision(userId, productId, pincode = null) {
  if (!productId) {
    throw new Error('Product ID is required.');
  }

  // 1. Fetch Product Details + Seller Offers
  const product = await getProductDetails(productId);
  if (!product || !product.title) {
    throw new Error('Product not found or unavailable.');
  }

  // 2. Fetch User Wallet
  let wallet = await Wallet.findOne({ userId }).lean();
  if (!wallet) {
    wallet = { cards: [], memberships: [], emiPreference: { preferredTenureMonths: 0, preferNoCostOnly: true } };
  }

  // 3. Fetch Price History
  const history = await PriceHistory.find({
    $or: [{ productId }, { canonicalProductId: productId }]
  }).sort({ timestamp: 1 }).lean();

  // 4. Calculate Effective Price across all offers
  const rawOffers = (product.offers && product.offers.length > 0)
    ? product.offers
    : [{
        retailer: product.retailer || 'Amazon',
        price: product.price || 0,
        url: product.productUrl || '',
        isDirectRetailerUrl: product.isDirectRetailerUrl || false,
        availability: product.availability || 'In Stock'
      }];

  const evaluatedSellers = [];
  for (const off of rawOffers) {
    const eff = await calculateEffectivePrice(off, wallet);
    evaluatedSellers.push({
      retailer: off.retailer,
      listedPrice: off.price,
      effectivePrice: eff.effectivePrice,
      totalSavings: eff.totalSavings,
      appliedRule: eff.appliedRule,
      emiOption: eff.emiOption,
      explanation: eff.explanation,
      productUrl: off.url,
      isDirectRetailerUrl: Boolean(off.isDirectRetailerUrl),
      availability: off.availability || 'In Stock'
    });
  }

  // Sort sellers by effectivePrice ascending
  evaluatedSellers.sort((a, b) => a.effectivePrice - b.effectivePrice);
  const bestSeller = evaluatedSellers[0];

  // 5. Calculate Affordability Plan
  const affordability = await planAffordability(userId, bestSeller.effectivePrice, product.category);

  // 6. Calculate Wait Forecast
  const waitForecast = forecastPriceDrop(history, bestSeller.effectivePrice);

  // 7. Calculate Smart Buy Score V2
  const smartBuyScore = calculateSmartBuyScore({
    currentPrice: bestSeller.effectivePrice,
    mrp: product.bestOffer?.mrp || product.mrp,
    history,
    budget: affordability.hasBudget ? { monthlyLimit: affordability.monthlyBudget } : null,
    remainingBudget: affordability.remainingBudget
  });

  // 8. Delivery Pincode Lookup
  const delivery = pincode ? validatePincode(pincode) : null;

  // 9. Synthesize Holistic Verdict
  let decision = smartBuyScore.recommendation;
  let headline = '';

  if (affordability.hasBudget && !affordability.affordableNow && affordability.budgetImpactPercent > 90) {
    decision = 'WAIT';
    headline = `Postpone purchase: Exceeds monthly budget by ₹${affordability.deficitAmount.toLocaleString()}. Safe to buy by ${new Date(affordability.earliestSafeDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.`;
  } else if (waitForecast.recommendedAction === 'WAIT_FOR_SALE' && decision !== 'BUY_NOW') {
    decision = 'WAIT';
    headline = `Wait for upcoming festival: ${waitForecast.dropProbability14Days}% chance of a price drop (~₹${waitForecast.potentialSavings.toLocaleString()} savings).`;
  } else if (decision === 'BUY_NOW' || decision === 'BUY') {
    if (bestSeller.totalSavings > 0 && bestSeller.appliedRule) {
      headline = `Buy from ${bestSeller.retailer} with ${bestSeller.appliedRule.cardName} for ₹${bestSeller.effectivePrice.toLocaleString()} (Save ₹${bestSeller.totalSavings.toLocaleString()}).`;
    } else {
      headline = `Best price: Buy from ${bestSeller.retailer} for ₹${bestSeller.effectivePrice.toLocaleString()}.`;
    }
  } else {
    headline = `Consider tracking: Price is stable at ₹${bestSeller.effectivePrice.toLocaleString()} but not currently at an optimal deal point.`;
  }

  const deterministicSummary = `${headline} ${smartBuyScore.priceAssessment} ${affordability.advice}`;

  // 10. Natural Language Summary (Gemini or deterministic)
  const summary = await generateNaturalLanguageSummary({
    productTitle: product.title,
    verdict: { decision, headline },
    bestSeller,
    affordability,
    waitForecast,
    smartBuyScore,
    deterministicSummary
  });

  return {
    product: {
      id: product.id || productId,
      title: product.title,
      brand: product.brand,
      model: product.model,
      image: product.image,
      specifications: product.specifications || {}
    },
    verdict: {
      decision,
      headline,
      summary
    },
    bestSeller,
    sellers: evaluatedSellers,
    affordability,
    waitForecast,
    smartBuyScore,
    delivery,
    dataSources: smartBuyScore.dataSources
  };
}

// @desc    Generate Personal Buy Decision
// @route   POST /api/decision
// @access  Private
export const getPersonalBuyDecision = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { productId, pincode } = req.body;

    const responsePayload = await calculatePersonalDecision(userId, productId, pincode);
    res.json(responsePayload);
  } catch (error) {
    logger.error({ error: error.message }, 'Personal Buy Decision Engine failed');
    res.status(500).json({ message: error.message || 'Personal buy decision could not be generated at this time.' });
  }
};

export default { getPersonalBuyDecision, calculatePersonalDecision };

