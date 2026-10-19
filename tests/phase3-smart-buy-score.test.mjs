import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateSmartBuyScore } from '../server/services/smartBuyScoreService.js';
import { analyzeDealHonesty } from '../server/utils/discountHonesty.js';
import { getSaleStatus } from '../server/utils/saleCalendar.js';

test('SmartBuyScore: Insufficient history guardrail prevents BUY_NOW and flags insufficientHistory', () => {
  // Only 1 price point (insufficient data)
  const result1 = calculateSmartBuyScore({
    currentPrice: 45000,
    history: [{ price: 45000, timestamp: new Date() }]
  });

  assert.strictEqual(result1.confidence, 'INSUFFICIENT');
  assert.strictEqual(result1.insufficientHistory, true);
  assert.notStrictEqual(result1.recommendation, 'BUY_NOW');
  assert.strictEqual(result1.recommendation, 'CONSIDER');
  assert.strictEqual(result1.smartBuyScore, 50);

  // 3 price points but all on the same day (span < 7 days)
  const today = new Date();
  const result2 = calculateSmartBuyScore({
    currentPrice: 42000,
    history: [
      { price: 45000, timestamp: today },
      { price: 44000, timestamp: today },
      { price: 42000, timestamp: today }
    ]
  });

  assert.strictEqual(result2.confidence, 'INSUFFICIENT');
  assert.strictEqual(result2.insufficientHistory, true);
  assert.notStrictEqual(result2.recommendation, 'BUY_NOW');
});

test('SmartBuyScore: Low confidence tier caps recommendation at BUY (never BUY_NOW)', () => {
  const dayMs = 24 * 60 * 60 * 1000;
  const now = new Date();

  // 4 points across 8 days (Span >= 7, but points < 6 -> LOW confidence)
  const history = [
    { price: 60000, timestamp: new Date(now.getTime() - 8 * dayMs) },
    { price: 58000, timestamp: new Date(now.getTime() - 5 * dayMs) },
    { price: 55000, timestamp: new Date(now.getTime() - 2 * dayMs) },
    { price: 40000, timestamp: now } // At all-time low
  ];

  const result = calculateSmartBuyScore({
    currentPrice: 40000,
    history
  });

  assert.strictEqual(result.confidence, 'LOW');
  assert.strictEqual(result.insufficientHistory, false);
  // Even with top score, LOW confidence must NEVER emit BUY_NOW
  assert.notStrictEqual(result.recommendation, 'BUY_NOW');
  assert.strictEqual(result.recommendation, 'BUY');
});

test('SmartBuyScore: High confidence with historical all-time low correctly emits BUY_NOW', () => {
  const dayMs = 24 * 60 * 60 * 1000;
  const now = new Date();

  // 20 points across 60 days -> HIGH confidence
  const history = [];
  for (let i = 20; i >= 1; i--) {
    history.push({
      price: 50000 + i * 500, // Range 50,500 to 60,000
      timestamp: new Date(now.getTime() - i * 3 * dayMs),
      sourceType: i % 2 === 0 ? 'backfill' : 'tracked'
    });
  }

  // Current price is ₹48,000 (below all-time low of ₹50,500)
  const result = calculateSmartBuyScore({
    currentPrice: 48000,
    history,
    budget: { monthlyLimit: 80000 },
    remainingBudget: 60000
  });

  assert.strictEqual(result.confidence, 'HIGH');
  assert.strictEqual(result.insufficientHistory, false);
  assert.strictEqual(result.recommendation, 'BUY_NOW');
  assert.ok(result.smartBuyScore >= 80);
  assert.strictEqual(result.percentiles.currentPercentile, 0); // 0th percentile (lowest ever)
});

test('DealHonesty: Flags inflated MRP when advertised MRP is > 35% above historical max', () => {
  const history = [
    { price: 40000, timestamp: new Date(Date.now() - 40 * 86400000) },
    { price: 42000, timestamp: new Date(Date.now() - 20 * 86400000) },
    { price: 39000, timestamp: new Date(Date.now() - 5 * 86400000) }
  ];

  // Historical max is 42,000. Retailer advertises MRP of 80,000 (90% inflation!)
  const honesty = analyzeDealHonesty(38000, 80000, history);

  assert.strictEqual(honesty.isFakeDiscount, true);
  assert.ok(honesty.flags.some(f => f.includes('Inflated MRP')));
  assert.ok(honesty.score <= 70);
});

test('DealHonesty: Detects pre-sale price bump (wash discount) in preceding 14 days', () => {
  const dayMs = 86400000;
  const now = Date.now();

  const history = [
    { price: 50000, timestamp: new Date(now - 30 * dayMs) },
    { price: 50000, timestamp: new Date(now - 25 * dayMs) },
    { price: 51000, timestamp: new Date(now - 20 * dayMs) },
    // Artificially bumped 6 days ago before a sale
    { price: 62000, timestamp: new Date(now - 6 * dayMs) }, // +22% spike!
    { price: 50000, timestamp: new Date(now) }              // Dropped back
  ];

  const honesty = analyzeDealHonesty(50000, 62000, history);

  assert.strictEqual(honesty.isFakeDiscount, true);
  assert.ok(honesty.flags.some(f => f.includes('Pre-sale price bump detected')));
  assert.strictEqual(honesty.level, 'DECEPTIVE');
  assert.ok(honesty.score < 60);
});

test('SmartBuyScore: Deceptive deal honesty suppresses BUY_NOW verdict', () => {
  const dayMs = 86400000;
  const now = Date.now();

  // History with pre-sale price bump
  const history = [];
  for (let i = 20; i >= 1; i--) {
    history.push({
      price: i === 3 ? 75000 : 50000, // Suspicious price bump 3 days ago
      timestamp: new Date(now - i * 3 * dayMs),
      sourceType: 'tracked'
    });
  }

  const result = calculateSmartBuyScore({
    currentPrice: 48000,
    mrp: 90000, // Inflated MRP
    history
  });

  assert.strictEqual(result.dealHonesty.level, 'DECEPTIVE');
  assert.notStrictEqual(result.recommendation, 'BUY_NOW');
});

test('SaleCalendar: Identifies upcoming and active Indian festival sales accurately', () => {
  // Test specific date during Republic Day Sale (e.g. Jan 20)
  const repDay = new Date(2026, 0, 20); // Jan 20
  const status1 = getSaleStatus(repDay);
  assert.strictEqual(status1.isSaleActive, true);
  assert.strictEqual(status1.activeEvent?.id, 'republic_day_sale');

  // Test date 5 days before Big Billion Days (e.g. Sept 15)
  const preBBD = new Date(2026, 8, 15); // Sept 15
  const status2 = getSaleStatus(preBBD, 14);
  assert.strictEqual(status2.isUpcomingSale, true);
  assert.strictEqual(status2.upcomingEvent?.id, 'big_billion_days');
  assert.strictEqual(status2.daysUntilSale, 5);
});

test('SmartBuyScore: Transparent factor breakdown & data source accounting', () => {
  const dayMs = 86400000;
  const now = Date.now();

  const history = [
    { price: 30000, timestamp: new Date(now - 60 * dayMs), sourceType: 'backfill', source: 'keepa' },
    { price: 29000, timestamp: new Date(now - 45 * dayMs), sourceType: 'backfill', source: 'keepa' },
    { price: 28000, timestamp: new Date(now - 30 * dayMs), sourceType: 'tracked', source: 'provider' },
    { price: 27500, timestamp: new Date(now - 15 * dayMs), sourceType: 'tracked', source: 'provider' },
    { price: 27000, timestamp: new Date(now), sourceType: 'tracked', source: 'provider' }
  ];

  const result = calculateSmartBuyScore({
    currentPrice: 27000,
    history
  });

  // Verify breakdown components exist with proper weights
  assert.ok(result.breakdown.percentileFactor);
  assert.strictEqual(result.breakdown.percentileFactor.weight, 0.40);
  assert.ok(result.breakdown.trendFactor);
  assert.strictEqual(result.breakdown.trendFactor.weight, 0.20);
  assert.ok(result.breakdown.dealHonestyFactor);
  assert.strictEqual(result.breakdown.dealHonestyFactor.weight, 0.20);
  assert.ok(result.breakdown.seasonalFactor);
  assert.strictEqual(result.breakdown.seasonalFactor.weight, 0.10);
  assert.ok(result.breakdown.budgetFactor);
  assert.strictEqual(result.breakdown.budgetFactor.weight, 0.10);

  // Verify data sources accounting
  assert.strictEqual(result.dataSources.totalPoints, 5);
  assert.strictEqual(result.dataSources.backfilledPoints, 2);
  assert.strictEqual(result.dataSources.selfCollectedPoints, 3);
  assert.strictEqual(result.dataSources.historySpanDays, 60);
});
