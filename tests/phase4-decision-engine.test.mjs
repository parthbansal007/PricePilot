import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateEffectivePrice } from '../server/services/effectivePriceService.js';
import { forecastPriceDrop } from '../server/services/waitForecaster.js';
import { DEFAULT_OFFER_RULES } from '../server/seeds/seedOfferRules.js';

test('EffectivePrice: Applies Amazon Pay ICICI 5% unlimited cashback for Prime members', async () => {
  const offer = { retailer: 'Amazon', price: 50000 };
  const wallet = {
    cards: [
      { id: 'c1', bank: 'ICICI', name: 'Amazon Pay ICICI', type: 'Credit', network: 'Visa' }
    ],
    memberships: [
      { id: 'm1', program: 'Amazon Prime', active: true }
    ],
    emiPreference: { preferredTenureMonths: 0, preferNoCostOnly: true }
  };

  const result = await calculateEffectivePrice(offer, wallet);

  // 5% of 50,000 = 2,500 savings -> effective price 47,500
  assert.strictEqual(result.totalSavings, 2500);
  assert.strictEqual(result.effectivePrice, 47500);
  assert.ok(result.appliedRule);
  assert.strictEqual(result.appliedRule.bank, 'ICICI');
  assert.strictEqual(result.appliedRule.guaranteed, true);
});

test('EffectivePrice: Applies 3% cashback for Amazon Pay ICICI when user is Non-Prime', async () => {
  const offer = { retailer: 'Amazon', price: 50000 };
  const wallet = {
    cards: [
      { id: 'c1', bank: 'ICICI', name: 'Amazon Pay ICICI', type: 'Credit', network: 'Visa' }
    ],
    memberships: [], // Non-Prime
    emiPreference: { preferredTenureMonths: 0, preferNoCostOnly: true }
  };

  const result = await calculateEffectivePrice(offer, wallet);

  // 3% of 50,000 = 1,500 savings -> effective price 48,500
  assert.strictEqual(result.totalSavings, 1500);
  assert.strictEqual(result.effectivePrice, 48500);
});

test('EffectivePrice: Applies HDFC 10% instant discount capped at ₹1,500 on eligible min spend', async () => {
  const wallet = {
    cards: [
      { id: 'c2', bank: 'HDFC', name: 'HDFC Millennia Credit Card', type: 'Credit', network: 'Visa' }
    ],
    memberships: [],
    emiPreference: { preferredTenureMonths: 0, preferNoCostOnly: true }
  };

  // Case 1: Order value ₹10,000 -> 10% is ₹1,000 (within ₹1,500 cap)
  const result1 = await calculateEffectivePrice({ retailer: 'Amazon', price: 10000 }, wallet);
  assert.strictEqual(result1.totalSavings, 1000);
  assert.strictEqual(result1.effectivePrice, 9000);

  // Case 2: Order value ₹30,000 -> 10% is ₹3,000, but capped at ₹1,500
  const result2 = await calculateEffectivePrice({ retailer: 'Amazon', price: 30000 }, wallet);
  assert.strictEqual(result2.totalSavings, 1500);
  assert.strictEqual(result2.effectivePrice, 28500);

  // Case 3: Order value ₹3,000 -> Below ₹5,000 min spend, discount does NOT apply
  const result3 = await calculateEffectivePrice({ retailer: 'Amazon', price: 3000 }, wallet);
  assert.strictEqual(result3.totalSavings, 0);
  assert.strictEqual(result3.effectivePrice, 3000);
  assert.strictEqual(result3.appliedRule, null);
});

test('EffectivePrice: Computes No-Cost EMI breakdown when preferred tenure is set', async () => {
  const offer = { retailer: 'Flipkart', price: 24000 };
  const wallet = {
    cards: [
      { id: 'c3', bank: 'Axis', name: 'Flipkart Axis', type: 'Credit', network: 'Visa' }
    ],
    memberships: [],
    emiPreference: { preferredTenureMonths: 6, preferNoCostOnly: true }
  };

  const result = await calculateEffectivePrice(offer, wallet);

  // 5% cashback on Flipkart Axis = 1,200 savings -> Effective price 22,800
  assert.strictEqual(result.effectivePrice, 22800);
  assert.ok(result.emiOption);
  assert.strictEqual(result.emiOption.tenureMonths, 6);
  assert.strictEqual(result.emiOption.isNoCost, true);
  assert.strictEqual(result.emiOption.monthlyEmi, 3800); // 22,800 / 6
  assert.strictEqual(result.emiOption.totalInterest, 0);
});

test('WaitForecaster: Correctly computes backtested drop probabilities across 7/14/30 day horizons', () => {
  const dayMs = 86400000;
  const now = Date.now();

  const history = [
    { price: 65000, timestamp: new Date(now - 60 * dayMs) },
    { price: 62000, timestamp: new Date(now - 45 * dayMs) },
    { price: 58000, timestamp: new Date(now - 30 * dayMs) },
    { price: 55000, timestamp: new Date(now - 15 * dayMs) },
    { price: 62000, timestamp: new Date(now) } // Currently high (near historical peak)
  ];

  const forecast = forecastPriceDrop(history, 62000, {
    saleStatus: { isSaleActive: false, isUpcomingSale: false }
  });

  assert.strictEqual(forecast.confidence, 'LOW'); // 5 points across 60 days
  assert.ok(forecast.dropProbability14Days > 0);
  assert.ok(forecast.dropProbability30Days >= forecast.dropProbability14Days);
  assert.ok(forecast.potentialSavings > 0);
  assert.strictEqual(forecast.backtestDataDays, 60);
});

test('WaitForecaster: Elevates drop probability and recommends waiting when major festival is within 14 days', () => {
  const dayMs = 86400000;
  const now = Date.now();

  const history = [];
  for (let i = 15; i >= 1; i--) {
    history.push({
      price: 45000 + (i % 3) * 2000,
      timestamp: new Date(now - i * 4 * dayMs)
    });
  }

  // Major festival (Big Billion Days) in 6 days
  const mockSaleStatus = {
    isSaleActive: false,
    isUpcomingSale: true,
    daysUntilSale: 6,
    upcomingEvent: { name: 'The Big Billion Days' }
  };

  const forecast = forecastPriceDrop(history, 49000, { saleStatus: mockSaleStatus });

  assert.strictEqual(forecast.confidence, 'HIGH');
  assert.ok(forecast.dropProbability14Days >= 65);
  assert.strictEqual(forecast.recommendedAction, 'WAIT_FOR_SALE');
  assert.ok(forecast.reason.includes('Big Billion Days'));
});

test('OfferRules: Default seed rules cover major Indian banks and retailers with verified status', () => {
  assert.ok(DEFAULT_OFFER_RULES.length >= 6);

  const retailers = DEFAULT_OFFER_RULES.map(r => r.retailer);
  assert.ok(retailers.includes('Amazon'));
  assert.ok(retailers.includes('Flipkart'));
  assert.ok(retailers.includes('Croma'));
  assert.ok(retailers.includes('Reliance Digital'));

  const banks = DEFAULT_OFFER_RULES.map(r => r.bank);
  assert.ok(banks.includes('HDFC'));
  assert.ok(banks.includes('ICICI'));
  assert.ok(banks.includes('SBI'));
  assert.ok(banks.includes('Axis'));

  assert.ok(DEFAULT_OFFER_RULES.every(r => r.status === 'verified'));
  assert.ok(DEFAULT_OFFER_RULES.every(r => r.validTo instanceof Date));
});
