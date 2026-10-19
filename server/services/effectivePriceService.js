import mongoose from 'mongoose';
import OfferRule from '../models/OfferRule.js';
import { DEFAULT_OFFER_RULES } from '../seeds/seedOfferRules.js';
import logger from '../utils/logger.js';

/**
 * Standard EMI calculation
 * @param {number} principal
 * @param {number} annualRate - e.g. 0.14 for 14% p.a.
 * @param {number} tenureMonths
 */
function calculateMonthlyEmi(principal, annualRate, tenureMonths) {
  if (tenureMonths <= 0) return { monthlyEmi: principal, totalInterest: 0 };
  if (annualRate <= 0) return { monthlyEmi: Math.round(principal / tenureMonths), totalInterest: 0 };

  const monthlyRate = annualRate / 12;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = Math.round(principal * monthlyRate * (factor / (factor - 1)));
  const totalPayment = emi * tenureMonths;
  const totalInterest = Math.max(0, totalPayment - principal);

  return { monthlyEmi: emi, totalInterest };
}

/**
 * Calculate effective purchase price by applying user's optimal wallet cards,
 * verified bank promotions, and EMI terms.
 *
 * @param {Object} offer - { retailer, price, mrp }
 * @param {Object} wallet - { cards: Array, memberships: Array, emiPreference: Object }
 * @returns {Promise<Object>} Effective price calculation breakdown
 */
export async function calculateEffectivePrice(offer, wallet = null) {
  const listedPrice = offer?.price || 0;
  if (listedPrice <= 0) {
    return {
      listedPrice: 0,
      effectivePrice: 0,
      totalSavings: 0,
      appliedRule: null,
      emiOption: null,
      explanation: 'Price unavailable'
    };
  }

  const retailerName = (offer.retailer || '').trim().toLowerCase();
  const userCards = wallet?.cards || [];
  const userMemberships = wallet?.memberships || [];
  const emiPref = wallet?.emiPreference || { preferredTenureMonths: 0, preferNoCostOnly: true };

  const now = new Date();

  // 1. Fetch active offer rules from DB if connected (or fall back to defaults)
  let activeRules = [];
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      activeRules = await OfferRule.find({
        validTo: { $gte: now },
        validFrom: { $lte: now }
      }).lean();
    } catch (err) {
      logger.warn({ error: err.message }, 'Failed to query OfferRules from database, using memory fallbacks');
    }
  }

  if (activeRules.length === 0) {
    activeRules = DEFAULT_OFFER_RULES;
  }

  let bestRule = null;
  let maxSavings = 0;
  let matchingCard = null;

  // 2. Iterate through user's cards and find the highest applicable discount
  for (const card of userCards) {
    const cardBank = (card.bank || '').trim().toLowerCase();
    const cardName = (card.name || '').trim().toLowerCase();
    const cardType = card.type || 'Credit';

    for (const rule of activeRules) {
      const ruleRetailer = rule.retailer.trim().toLowerCase();
      const ruleBank = rule.bank.trim().toLowerCase();

      // Check retailer match
      const retailerMatches = ruleRetailer === 'universal' || retailerName.includes(ruleRetailer);
      if (!retailerMatches) continue;

      // Check bank match
      const bankMatches = ruleBank === 'universal' || cardBank.includes(ruleBank);
      if (!bankMatches) continue;

      // Check card type match
      if (rule.cardType !== 'All' && rule.cardType !== cardType) continue;

      // Check card name match if specified
      if (rule.cardName) {
        const ruleCardName = rule.cardName.trim().toLowerCase();
        if (!cardName.includes(ruleCardName)) continue;
      }

      // Check min spend
      if (rule.minSpend && listedPrice < rule.minSpend) continue;

      // Special check: Prime membership requirement for Amazon ICICI 5%
      if (rule.cardName && rule.cardName.toLowerCase().includes('amazon pay icici')) {
        const isPrime = userMemberships.some(m => m.program.toLowerCase().includes('prime') && m.active);
        // Non-prime gets 3% instead of 5%
        const effectivePercent = isPrime ? 5 : 3;
        const savings = Math.round(listedPrice * (effectivePercent / 100));
        if (savings > maxSavings) {
          maxSavings = savings;
          bestRule = {
            ...rule,
            percent: effectivePercent,
            calculatedSavings: savings
          };
          matchingCard = card;
        }
        continue;
      }

      // Calculate discount amount
      let savings = 0;
      if (rule.discountType === 'instant_percent' || rule.discountType === 'cashback_percent') {
        const rawDiscount = (listedPrice * rule.percent) / 100;
        savings = rule.cap ? Math.min(rawDiscount, rule.cap) : rawDiscount;
      } else if (rule.discountType === 'instant_flat' || rule.discountType === 'cashback_flat') {
        savings = Math.min(rule.percent, listedPrice);
      }

      savings = Math.round(savings);

      if (savings > maxSavings) {
        maxSavings = savings;
        bestRule = {
          ...rule,
          calculatedSavings: savings
        };
        matchingCard = card;
      }
    }
  }

  const effectivePrice = Math.max(0, listedPrice - maxSavings);

  // 3. Format Applied Rule Information
  let appliedRule = null;
  if (bestRule && maxSavings > 0) {
    const isVerified = bestRule.status === 'verified';
    const verifiedDateStr = bestRule.verifiedAt
      ? new Date(bestRule.verifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'recently';

    appliedRule = {
      id: bestRule._id ? bestRule._id.toString() : bestRule.retailer + bestRule.bank,
      bank: bestRule.bank,
      cardName: matchingCard ? `${matchingCard.bank} ${matchingCard.name}` : bestRule.bank,
      discountType: bestRule.discountType,
      savings: maxSavings,
      description: bestRule.description,
      status: bestRule.status,
      verifiedAt: bestRule.verifiedAt,
      guaranteed: isVerified,
      verificationNote: isVerified ? `Verified on ${verifiedDateStr}` : 'Unverified community offer (estimate)'
    };
  }

  // 4. Calculate EMI terms if requested by user
  let emiOption = null;
  if (emiPref.preferredTenureMonths > 0) {
    const tenure = emiPref.preferredTenureMonths;
    // Standard Indian e-commerce No-Cost EMI is available on orders >= ₹3,000 for 3 or 6 months
    const isNoCostEligible = effectivePrice >= 3000 && tenure <= 6;

    if (isNoCostEligible && emiPref.preferNoCostOnly) {
      emiOption = {
        tenureMonths: tenure,
        isNoCost: true,
        monthlyEmi: Math.round(effectivePrice / tenure),
        totalInterest: 0
      };
    } else {
      const emiMath = calculateMonthlyEmi(effectivePrice, 0.14, tenure);
      emiOption = {
        tenureMonths: tenure,
        isNoCost: false,
        monthlyEmi: emiMath.monthlyEmi,
        totalInterest: emiMath.totalInterest
      };
    }
  }

  // 5. Generate Explanation
  let explanation = '';
  if (appliedRule) {
    explanation = `Save ₹${maxSavings.toLocaleString()} using ${appliedRule.cardName} (${appliedRule.description}). Effective price: ₹${effectivePrice.toLocaleString()}.`;
  } else if (userCards.length === 0) {
    explanation = `Listed at ₹${listedPrice.toLocaleString()}. Add your cards in Wallet Settings to discover instant bank discounts and cashback.`;
  } else {
    explanation = `Listed at ₹${listedPrice.toLocaleString()}. No matching bank card discounts found for current retailer order value.`;
  }

  return {
    listedPrice,
    effectivePrice,
    totalSavings: maxSavings,
    appliedRule,
    emiOption,
    explanation
  };
}

export default { calculateEffectivePrice };
