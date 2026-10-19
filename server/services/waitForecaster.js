import { getSaleStatus } from '../utils/saleCalendar.js';

/**
 * Wait Forecaster
 * Evaluates the empirical probability of a price drop in 7, 14, and 30 days
 * by backtesting against stored price history and adjusting for Indian festive sales.
 *
 * @param {Array} history - Array of { price, timestamp }
 * @param {number} currentPrice
 * @param {Object} [options]
 * @returns {Object} Forecast results with backtest provenance
 */
export function forecastPriceDrop(history = [], currentPrice = 0, options = {}) {
  const validPoints = (history || [])
    .filter(h => typeof h.price === 'number' && h.price > 0)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const totalPoints = validPoints.length;
  const earliestDate = totalPoints > 0 ? new Date(validPoints[0].timestamp) : null;
  const latestDate = totalPoints > 0 ? new Date(validPoints[totalPoints - 1].timestamp) : null;
  const backtestDataDays = (earliestDate && latestDate)
    ? Math.max(1, Math.round((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // 1. Confidence Evaluation
  let confidence = 'HIGH';
  if (totalPoints < 3 || backtestDataDays < 7) {
    confidence = 'INSUFFICIENT';
  } else if (totalPoints < 6 || backtestDataDays < 14) {
    confidence = 'LOW';
  } else if (totalPoints < 15 || backtestDataDays < 45) {
    confidence = 'MEDIUM';
  } else {
    confidence = 'HIGH';
  }

  const saleStatus = options.saleStatus || getSaleStatus(new Date(), 14);

  // Insufficient history fallback
  if (confidence === 'INSUFFICIENT' || currentPrice <= 0) {
    return {
      dropProbability7Days: 30,
      dropProbability14Days: 45,
      dropProbability30Days: 60,
      expectedPriceRange: { min: currentPrice, max: currentPrice },
      potentialSavings: 0,
      recommendedAction: 'TRACK',
      reason: 'Insufficient price history data to build a backtested price forecast. Add to tracker to begin monitoring.',
      confidence: 'INSUFFICIENT',
      backtestDataDays,
      historicalDropsSampled: 0
    };
  }

  const prices = validPoints.map(p => p.price);
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const lowest = sortedPrices[0];
  const p10 = sortedPrices[Math.floor(sortedPrices.length * 0.10)] || lowest;
  const _median = sortedPrices[Math.floor(sortedPrices.length * 0.50)] || currentPrice;
  const highest = sortedPrices[sortedPrices.length - 1];

  // Current price rank
  const countBelow = sortedPrices.filter(p => p <= currentPrice).length;
  const currentPercentile = Math.round((countBelow / sortedPrices.length) * 100);

  // 2. Backtest sliding drop occurrences on stored history
  const dayMs = 24 * 60 * 60 * 1000;
  let sampleCount = 0;
  let drops7Count = 0;
  let drops14Count = 0;
  let drops30Count = 0;

  for (let i = 0; i < validPoints.length - 1; i++) {
    const pt = validPoints[i];
    const ptTime = new Date(pt.timestamp).getTime();
    sampleCount++;

    let hasDrop7 = false;
    let hasDrop14 = false;
    let hasDrop30 = false;

    for (let j = i + 1; j < validPoints.length; j++) {
      const futurePt = validPoints[j];
      const futureTime = new Date(futurePt.timestamp).getTime();
      const diffDays = (futureTime - ptTime) / dayMs;

      // Price dropped by at least 2% below starting point
      if (futurePt.price <= pt.price * 0.98) {
        if (diffDays <= 7) hasDrop7 = true;
        if (diffDays <= 14) hasDrop14 = true;
        if (diffDays <= 30) hasDrop30 = true;
      }

      if (diffDays > 30) break;
    }

    if (hasDrop7) drops7Count++;
    if (hasDrop14) drops14Count++;
    if (hasDrop30) drops30Count++;
  }

  // Baseline empirical probabilities from backtest
  let baseProb7 = sampleCount > 0 ? (drops7Count / sampleCount) * 100 : 25;
  let baseProb14 = sampleCount > 0 ? (drops14Count / sampleCount) * 100 : 45;
  let baseProb30 = sampleCount > 0 ? (drops30Count / sampleCount) * 100 : 65;

  // 3. Percentile Rank Adjustment
  // If price is near historical peak, drop probability is elevated; if at all-time low, drop probability is muted
  let rankMultiplier = 1.0;
  if (currentPercentile <= 10) {
    rankMultiplier = 0.35; // Already at all-time low, unlikely to drop further
  } else if (currentPercentile <= 25) {
    rankMultiplier = 0.65;
  } else if (currentPercentile <= 60) {
    rankMultiplier = 1.0;
  } else if (currentPercentile <= 80) {
    rankMultiplier = 1.35;
  } else {
    rankMultiplier = 1.6; // High price, drops very likely
  }

  let p7 = Math.round(baseProb7 * rankMultiplier);
  let p14 = Math.round(baseProb14 * rankMultiplier);
  let p30 = Math.round(baseProb30 * rankMultiplier);

  // 4. Sale Calendar Impact
  let saleImpactNote = '';
  if (saleStatus.isUpcomingSale && saleStatus.daysUntilSale <= 14 && currentPrice > p10) {
    // Huge incentive to wait: upcoming festival
    const festivalBoost = Math.max(15, 35 - saleStatus.daysUntilSale * 2);
    p14 = Math.min(95, p14 + festivalBoost);
    p30 = Math.min(98, p30 + festivalBoost);
    saleImpactNote = `Upcoming ${saleStatus.upcomingEvent.name} in ${saleStatus.daysUntilSale} days increases drop probability significantly.`;
  } else if (saleStatus.isSaleActive) {
    // Active sale: promotional prices are running now
    p7 = Math.max(10, Math.round(p7 * 0.7));
    saleImpactNote = `Active sale (${saleStatus.activeEvent.name}) running now.`;
  }

  p7 = Math.max(5, Math.min(95, p7));
  p14 = Math.max(10, Math.min(98, p14));
  p30 = Math.max(15, Math.min(99, p30));

  // 5. Expected Low & Savings
  const predictedLow = Math.min(currentPrice, p10 > 0 ? p10 : lowest);
  const potentialSavings = Math.max(0, currentPrice - predictedLow);

  // 6. Action Verdict
  let recommendedAction = 'TRACK';
  let reason = '';

  if (currentPercentile <= 10 && !saleStatus.isUpcomingSale) {
    recommendedAction = 'BUY_NOW';
    reason = `Current price is near historical lowest. Only a ${p14}% chance of dropping further in the next 14 days based on ${backtestDataDays} days of data.`;
  } else if (p14 >= 65 || (saleStatus.isUpcomingSale && saleStatus.daysUntilSale <= 14)) {
    recommendedAction = 'WAIT_FOR_SALE';
    reason = `${p14}% likelihood of a lower price within 14 days (potential savings: ~₹${potentialSavings.toLocaleString()}). ${saleImpactNote || 'Wait advised.'}`;
  } else {
    recommendedAction = 'TRACK';
    reason = `Moderate drop probability (${p14}% in 14 days). Set a price target to be notified automatically.`;
  }

  return {
    dropProbability7Days: p7,
    dropProbability14Days: p14,
    dropProbability30Days: p30,
    expectedPriceRange: {
      min: predictedLow,
      max: highest
    },
    potentialSavings,
    recommendedAction,
    reason,
    confidence,
    backtestDataDays,
    historicalDropsSampled: sampleCount
  };
}

export default { forecastPriceDrop };
