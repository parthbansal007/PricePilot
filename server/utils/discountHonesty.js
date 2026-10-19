/**
 * Detects deceptive discounting practices in Indian e-commerce:
 * 1. Inflated MRP (artificial reference prices)
 * 2. Pre-sale price bumps (raising prices right before dropping them to fake a "deep discount")
 */
export function analyzeDealHonesty(currentPrice, advertisedMrp, history = []) {
  const flags = [];
  let honestyScore = 100;
  let isFakeDiscount = false;

  const validPoints = (history || [])
    .filter(h => typeof h.price === 'number' && h.price > 0)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  if (validPoints.length === 0 || !currentPrice || currentPrice <= 0) {
    return {
      score: 100,
      level: 'HONEST',
      isFakeDiscount: false,
      flags: [],
      evidence: {
        advertisedMrp: advertisedMrp || null,
        historicalMax: currentPrice,
        historicalMedian: currentPrice,
        recentPriceJumpPercent: 0,
        preDropPeakPrice: null
      }
    };
  }

  const prices = validPoints.map(p => p.price);
  const historicalMax = Math.max(...prices);
  const historicalMin = Math.min(...prices);

  // Compute median
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sortedPrices.length / 2);
  const historicalMedian = sortedPrices.length % 2 !== 0
    ? sortedPrices[mid]
    : Math.round((sortedPrices[mid - 1] + sortedPrices[mid]) / 2);

  let preDropPeakPrice = null;
  let recentPriceJumpPercent = 0;

  // 1. MRP Inflation Check
  if (advertisedMrp && advertisedMrp > currentPrice) {
    const mrpVsMaxRatio = advertisedMrp / historicalMax;
    const mrpVsMedianRatio = advertisedMrp / historicalMedian;

    if (mrpVsMaxRatio >= 1.35 || mrpVsMedianRatio >= 1.50) {
      const inflationPercent = Math.round((mrpVsMedianRatio - 1) * 100);
      flags.push(
        `Inflated MRP: Advertised MRP (₹${advertisedMrp.toLocaleString()}) is ${inflationPercent}% higher than historical median selling price (₹${historicalMedian.toLocaleString()}).`
      );
      honestyScore -= 30;
      isFakeDiscount = true;
    }
  }

  // 2. Pre-Sale Price Bump Check (Look back 14 days)
  if (validPoints.length >= 3) {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentPoints = validPoints.filter(p => new Date(p.timestamp) >= fourteenDaysAgo);
    const olderPoints = validPoints.filter(p => {
      const t = new Date(p.timestamp);
      return t >= thirtyDaysAgo && t < fourteenDaysAgo;
    });

    if (recentPoints.length >= 2) {
      const recentPeak = Math.max(...recentPoints.map(p => p.price));
      const olderPrices = olderPoints.map(p => p.price);
      const baseline = olderPrices.length > 0
        ? olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length
        : historicalMedian;

      // If price surged by >= 12% in the last 14 days before dropping to current price
      if (recentPeak > baseline * 1.12 && currentPrice < recentPeak * 0.92) {
        preDropPeakPrice = recentPeak;
        recentPriceJumpPercent = Math.round(((recentPeak - baseline) / baseline) * 100);

        flags.push(
          `Pre-sale price bump detected: Price was artificially hiked by ${recentPriceJumpPercent}% to ₹${recentPeak.toLocaleString()} in the last 14 days before dropping to current ₹${currentPrice.toLocaleString()}.`
        );
        honestyScore -= 55;
        isFakeDiscount = true;
      }
    }
  }

  honestyScore = Math.max(0, Math.min(100, honestyScore));

  let level = 'HONEST';
  if (honestyScore < 50) level = 'DECEPTIVE';
  else if (honestyScore < 80) level = 'SUSPICIOUS';

  return {
    score: honestyScore,
    level,
    isFakeDiscount,
    flags,
    evidence: {
      advertisedMrp: advertisedMrp || null,
      historicalMax,
      historicalMin,
      historicalMedian,
      recentPriceJumpPercent,
      preDropPeakPrice
    }
  };
}

export default { analyzeDealHonesty };
