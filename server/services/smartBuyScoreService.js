import { analyzeDealHonesty } from '../utils/discountHonesty.js';
import { getSaleStatus } from '../utils/saleCalendar.js';

/**
 * Compute empirical percentile value at given p (0-100)
 */
function getPercentileValue(sortedAscPrices, p) {
  if (sortedAscPrices.length === 0) return 0;
  if (sortedAscPrices.length === 1) return sortedAscPrices[0];
  const index = (p / 100) * (sortedAscPrices.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return Math.round(sortedAscPrices[lower] * (1 - weight) + sortedAscPrices[upper] * weight);
}

/**
 * Smart Buy Score V2 Engine
 * Implements percentile-based historical scoring, confidence estimation,
 * fake-discount detection, and sale-calendar awareness.
 *
 * @param {Object} params
 * @param {number} params.currentPrice
 * @param {number} [params.mrp]
 * @param {Array} params.history - Array of { price, timestamp, source, sourceType, retailer }
 * @param {Object} [params.budget] - { monthlyLimit }
 * @param {number} [params.remainingBudget]
 * @returns {Object} Comprehensive Smart Buy Score V2 breakdown
 */
export function calculateSmartBuyScore(params) {
  const {
    currentPrice = 0,
    mrp = null,
    history = [],
    budget = null,
    remainingBudget = Infinity
  } = params;

  const validPoints = (history || [])
    .filter(h => typeof h.price === 'number' && h.price > 0)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const totalPoints = validPoints.length;
  let backfilledPoints = 0;
  let selfCollectedPoints = 0;

  for (const pt of validPoints) {
    if (pt.sourceType === 'backfill' || pt.source === 'keepa') {
      backfilledPoints++;
    } else {
      selfCollectedPoints++;
    }
  }

  const earliestDate = totalPoints > 0 ? new Date(validPoints[0].timestamp) : null;
  const latestDate = totalPoints > 0 ? new Date(validPoints[totalPoints - 1].timestamp) : null;
  const historySpanDays = (earliestDate && latestDate)
    ? Math.max(1, Math.round((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // 1. Determine Confidence Tier
  let confidence = 'HIGH';
  let insufficientHistory = false;

  if (totalPoints < 3 || historySpanDays < 7) {
    confidence = 'INSUFFICIENT';
    insufficientHistory = true;
  } else if (totalPoints < 6 || historySpanDays < 14) {
    confidence = 'LOW';
  } else if (totalPoints < 15 || historySpanDays < 45) {
    confidence = 'MEDIUM';
  } else {
    confidence = 'HIGH';
  }

  // 2. Data Sources Summary
  const dataSources = {
    totalPoints,
    backfilledPoints,
    selfCollectedPoints,
    historySpanDays,
    earliestDate: earliestDate ? earliestDate.toISOString() : null,
    latestDate: latestDate ? latestDate.toISOString() : null
  };

  // If history is insufficient, enforce safety guardrails immediately
  if (insufficientHistory || currentPrice <= 0) {
    return {
      smartBuyScore: 50,
      recommendation: 'CONSIDER',
      confidence: 'INSUFFICIENT',
      insufficientHistory: true,
      percentiles: {
        p10: currentPrice,
        p25: currentPrice,
        p50: currentPrice,
        p75: currentPrice,
        p90: currentPrice,
        lowest: currentPrice,
        highest: currentPrice,
        currentPercentile: 50
      },
      dealHonesty: {
        score: 100,
        level: 'HONEST',
        isFakeDiscount: false,
        flags: [],
        evidence: { advertisedMrp: mrp, historicalMax: currentPrice, historicalMedian: currentPrice, recentPriceJumpPercent: 0, preDropPeakPrice: null }
      },
      breakdown: {
        percentileFactor: { score: 50, weight: 0.40, label: 'Insufficient historical data points to compute price rank.' },
        trendFactor: { score: 50, weight: 0.20, label: 'Insufficient history span to evaluate trend.' },
        dealHonestyFactor: { score: 100, weight: 0.20, label: 'No deceptive pricing flags detected.' },
        seasonalFactor: { score: 50, weight: 0.10, label: 'Standard pricing window.' },
        budgetFactor: { score: 50, weight: 0.10, label: budget ? 'Budget status checked.' : 'No budget configured.' }
      },
      dataSources,
      factors: ['Insufficient historical price history (minimum 3 points across 7 days required) to confirm a deal.'],
      priceAssessment: 'Price history is currently insufficient to determine if this is a genuine discount.',
      trendAssessment: 'UNKNOWN',
      budgetAssessment: budget ? (currentPrice <= remainingBudget ? 'Within budget' : 'Exceeds budget') : 'No budget set',
      caution: 'Do not rush: insufficient history to confirm whether current price is a good deal. We recommend adding this to your tracker.'
    };
  }

  // 3. Percentile Distribution Analysis
  const sortedPrices = validPoints.map(p => p.price).sort((a, b) => a - b);
  const lowest = sortedPrices[0];
  const highest = sortedPrices[sortedPrices.length - 1];
  const p10 = getPercentileValue(sortedPrices, 10);
  const p25 = getPercentileValue(sortedPrices, 25);
  const p50 = getPercentileValue(sortedPrices, 50); // Median
  const p75 = getPercentileValue(sortedPrices, 75);
  const p90 = getPercentileValue(sortedPrices, 90);

  // Calculate current price rank percentile (0 = lowest ever, 100 = peak)
  const countAtOrBelow = sortedPrices.filter(p => p <= currentPrice).length;
  const currentPercentile = Math.round((countAtOrBelow / totalPoints) * 100);

  // Percentile Factor Score (Weight: 40%)
  let percentileScore = 50;
  let percentileLabel = '';

  if (currentPrice <= lowest) {
    percentileScore = 100;
    percentileLabel = `At historical all-time low (₹${lowest.toLocaleString()}). Lower than 100% of recorded prices.`;
  } else if (currentPrice <= p10) {
    percentileScore = 90;
    percentileLabel = `Top 10% best price ever recorded (below ₹${p10.toLocaleString()}).`;
  } else if (currentPrice <= p25) {
    percentileScore = 78;
    percentileLabel = `Lower quartile deal (below ₹${p25.toLocaleString()}). Cheaper than 75% of historical prices.`;
  } else if (currentPrice <= p50) {
    percentileScore = 60;
    percentileLabel = `Below median price (₹${p50.toLocaleString()}). Fair value.`;
  } else if (currentPrice <= p75) {
    percentileScore = 35;
    percentileLabel = `Above historical median (₹${p50.toLocaleString()}). Not currently discounted.`;
  } else {
    percentileScore = 15;
    percentileLabel = `In upper price quartile (near peak ₹${highest.toLocaleString()}). Significantly overpriced compared to historical sales.`;
  }

  // 4. Trend & Volatility Analysis (Weight: 20%)
  let trendScore = 50;
  let trendDirection = 'STABLE';
  let trendLabel = '';

  const recentWindow = validPoints.slice(-5);
  const firstRecent = recentWindow[0].price;
  const lastRecent = recentWindow[recentWindow.length - 1].price;

  if (lastRecent < firstRecent * 0.96) {
    trendDirection = 'DOWN';
    trendScore = currentPrice <= p25 ? 90 : 75;
    trendLabel = `Price is trending downward (dropped by ₹${(firstRecent - lastRecent).toLocaleString()} recently).`;
  } else if (lastRecent > firstRecent * 1.04) {
    trendDirection = 'UP';
    trendScore = 25;
    trendLabel = `Price is trending upward (increased by ₹${(lastRecent - firstRecent).toLocaleString()} recently).`;
  } else {
    trendDirection = 'STABLE';
    trendScore = currentPrice <= p25 ? 80 : 50;
    trendLabel = `Price has remained stable around ₹${currentPrice.toLocaleString()}.`;
  }

  // 5. Deal Honesty & Fake-Discount Detection (Weight: 20%)
  const dealHonesty = analyzeDealHonesty(currentPrice, mrp, validPoints);
  const honestyScore = dealHonesty.score;
  const honestyLabel = dealHonesty.flags.length > 0
    ? dealHonesty.flags.join(' ')
    : 'Honest pricing with verified historical consistency.';

  // 6. Seasonal / Sale-Calendar Factor (Weight: 10%)
  const saleStatus = getSaleStatus(new Date(), 14);
  let seasonalScore = 60;
  let seasonalLabel = 'Regular shopping window.';

  if (saleStatus.isSaleActive) {
    seasonalScore = 90;
    seasonalLabel = `Active promotional festival: ${saleStatus.activeEvent.name}. Retailers are competing on pricing.`;
  } else if (saleStatus.isUpcomingSale && saleStatus.daysUntilSale <= 14) {
    // If a major sale is within 14 days and current price is not already at an all-time low (p10)
    if (currentPrice > p10) {
      seasonalScore = 25;
      seasonalLabel = `Upcoming festival in ${saleStatus.daysUntilSale} days: ${saleStatus.upcomingEvent.name}. Expect price drops during the event.`;
    } else {
      seasonalScore = 75;
      seasonalLabel = `Upcoming festival: ${saleStatus.upcomingEvent.name}, but current price is already near historical lowest.`;
    }
  }

  // 7. Budget Fit Factor (Weight: 10%)
  let budgetScore = 50;
  let budgetLabel = 'No budget limit specified.';

  if (budget) {
    if (currentPrice <= remainingBudget) {
      budgetScore = 90;
      budgetLabel = `Comfortably fits within remaining monthly budget (₹${remainingBudget.toLocaleString()} left).`;
    } else {
      budgetScore = 15;
      budgetLabel = `Exceeds remaining monthly budget by ₹${(currentPrice - remainingBudget).toLocaleString()}.`;
    }
  }

  // 8. Weighted Smart Buy Score Computation
  const weightedScore = Math.round(
    percentileScore * 0.40 +
    trendScore * 0.20 +
    honestyScore * 0.20 +
    seasonalScore * 0.10 +
    budgetScore * 0.10
  );
  const smartBuyScore = Math.max(0, Math.min(100, weightedScore));

  // 9. Verdict Determination with Strict Safeguards
  let recommendation = 'CONSIDER';

  // OPERATING RULE:
  // - Low or Insufficient confidence CANNOT emit BUY_NOW
  // - Deceptive deal honesty CANNOT emit BUY_NOW
  // - BUY_NOW requires: score >= 80, confidence HIGH/MEDIUM, dealHonesty HONEST, and currentPrice <= p25
  if (
    smartBuyScore >= 80 &&
    (confidence === 'HIGH' || confidence === 'MEDIUM') &&
    dealHonesty.level === 'HONEST' &&
    currentPrice <= p25
  ) {
    recommendation = 'BUY_NOW';
  } else if (smartBuyScore >= 65 && dealHonesty.level !== 'DECEPTIVE') {
    recommendation = 'BUY';
  } else if (smartBuyScore >= 40) {
    recommendation = 'CONSIDER';
  } else {
    recommendation = 'WAIT';
  }

  // 10. Compile Transparent Factors
  const factors = [];
  factors.push(percentileLabel);
  factors.push(trendLabel);
  if (dealHonesty.flags.length > 0) {
    factors.push(...dealHonesty.flags);
  }
  if (saleStatus.isUpcomingSale && saleStatus.daysUntilSale <= 14 && currentPrice > p10) {
    factors.push(`Upcoming sale: ${saleStatus.upcomingEvent.name} in ${saleStatus.daysUntilSale} days.`);
  }
  if (budget) {
    factors.push(budgetLabel);
  }

  let caution = '';
  if (dealHonesty.level === 'DECEPTIVE') {
    caution = 'Caution: Potential fake discount or inflated MRP detected based on price history.';
  } else if (saleStatus.isUpcomingSale && saleStatus.daysUntilSale <= 14 && currentPrice > p10) {
    caution = `Waiting recommended: ${saleStatus.upcomingEvent.name} starts in ${saleStatus.daysUntilSale} days.`;
  } else if (currentPrice > p50) {
    caution = 'Current price is in the upper historical range. Better prices are regularly observed.';
  } else {
    caution = 'Prices are favorable based on verified historical benchmarks.';
  }

  return {
    smartBuyScore,
    recommendation,
    confidence,
    insufficientHistory: false,
    percentiles: {
      p10,
      p25,
      p50,
      p75,
      p90,
      lowest,
      highest,
      currentPercentile
    },
    dealHonesty,
    breakdown: {
      percentileFactor: { score: percentileScore, weight: 0.40, label: percentileLabel },
      trendFactor: { score: trendScore, weight: 0.20, label: trendLabel },
      dealHonestyFactor: { score: honestyScore, weight: 0.20, label: honestyLabel },
      seasonalFactor: { score: seasonalScore, weight: 0.10, label: seasonalLabel },
      budgetFactor: { score: budgetScore, weight: 0.10, label: budgetLabel }
    },
    dataSources,
    factors,
    priceAssessment: `Historical median: ₹${p50.toLocaleString()}. Lowest: ₹${lowest.toLocaleString()}. Current price is at the ${currentPercentile}th percentile.`,
    trendAssessment: trendDirection,
    budgetAssessment: budget ? (currentPrice <= remainingBudget ? 'Within budget' : 'Exceeds budget') : 'No budget set',
    caution
  };
}

export default { calculateSmartBuyScore };
