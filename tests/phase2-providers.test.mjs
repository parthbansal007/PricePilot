import test from 'node:test';
import assert from 'node:assert/strict';

import { isTrustedRetailer, isAccessoryTitle, filterValidOffers } from '../server/utils/retailerFilter.js';
import { parseQueryHeuristic, queryUnderstandingSchema } from '../server/services/queryUnderstandingService.js';
import { keepaTimeToDate } from '../server/providers/adapters/KeepaHistoryAdapter.js';
import MockDiscoveryProvider from '../server/providers/adapters/MockDiscoveryProvider.js';
import MockRetailerProvider from '../server/providers/adapters/MockRetailerProvider.js';
import MockHistoryProvider from '../server/providers/adapters/MockHistoryProvider.js';
import MockIdentityProvider from '../server/providers/adapters/MockIdentityProvider.js';
import MockReviewProvider from '../server/providers/adapters/MockReviewProvider.js';
import MockAffiliateLinkProvider from '../server/providers/adapters/MockAffiliateLinkProvider.js';
import cacheService from '../server/services/cacheService.js';
import { DiscoveryRouter } from '../server/services/discoveryRouter.js';

test('RetailerFilter: correctly identifies trusted Indian retailers', () => {
  assert.strictEqual(isTrustedRetailer('Amazon India'), true);
  assert.strictEqual(isTrustedRetailer('Flipkart'), true);
  assert.strictEqual(isTrustedRetailer('Croma Store'), true);
  assert.strictEqual(isTrustedRetailer('Reliance Digital'), true);
  assert.strictEqual(isTrustedRetailer('ShadyUnverifiedStore.xyz'), false);
  assert.strictEqual(isTrustedRetailer(null), false);
});

test('RetailerFilter: accessory detection catches covers, cases, screen guards, cables', () => {
  assert.strictEqual(isAccessoryTitle('Spigen Liquid Air Case for iPhone 15'), true);
  assert.strictEqual(isAccessoryTitle('Tempered Glass Screen Protector for Galaxy S24'), true);
  assert.strictEqual(isAccessoryTitle('USB-C 65W Fast Charger Cable'), true);
  assert.strictEqual(isAccessoryTitle('Apple iPhone 15 Pro 128GB Natural Titanium'), false);
  assert.strictEqual(isAccessoryTitle('Lenovo Legion Pro 5 16IRX9 Gaming Laptop'), false);
});

test('RetailerFilter: filterValidOffers eliminates accessory pollution and price outliers', () => {
  const items = [
    { title: 'Apple MacBook Air M2 8GB 256GB', price: 89900 },
    { title: 'Apple MacBook Air M2 16GB 512GB', price: 109900 },
    { title: 'Apple MacBook Air M2 8GB 512GB', price: 99900 },
    { title: 'Hardshell Protective Case for MacBook Air M2', price: 999 }, // Accessory
    { title: 'Apple MacBook Air M2 Gold Plated Luxury Edition', price: 850000 } // Outlier > 4x median
  ];

  const filtered = filterValidOffers(items, { queryWantsAccessory: false });
  assert.strictEqual(filtered.length, 3);
  assert.ok(filtered.every(item => item.price >= 80000 && item.price <= 120000));
});

test('QueryUnderstanding: extracts brand, category, budget, and cleans search query heuristically', () => {
  const parsed = parseQueryHeuristic('best Apple MacBook Air under 90000');
  assert.strictEqual(parsed.brand, 'Apple');
  assert.strictEqual(parsed.category, 'laptop');
  assert.strictEqual(parsed.budget.max, 90000);
  assert.strictEqual(parsed.intent, 'search');
  assert.ok(parsed.cleanSearchQuery.includes('MacBook Air'));
  assert.ok(!parsed.cleanSearchQuery.includes('best'));
  assert.ok(!parsed.cleanSearchQuery.includes('90000'));

  // Validates through Zod schema
  assert.doesNotThrow(() => queryUnderstandingSchema.parse(parsed));
});

test('KeepaHistoryAdapter: converts Keepa minute timestamps to standard JavaScript Date accurately', () => {
  // Keepa epoch offset is 21564000 minutes from Unix epoch
  // At keepaTime = 0, epochMs = 21564000 * 60000 = 1293840000000 (2011-01-01T00:00:00.000Z)
  const dateZero = keepaTimeToDate(0);
  assert.strictEqual(dateZero.toISOString(), '2011-01-01T00:00:00.000Z');

  // 1000 minutes later
  const date1000 = keepaTimeToDate(1000);
  assert.strictEqual(date1000.getTime() - dateZero.getTime(), 1000 * 60000);
});

test('CacheService: calculates popularity-adjusted TTL based on access hits', () => {
  const lowHitsTtl = cacheService.calculatePopularityTtl(5, 3600);
  const midHitsTtl = cacheService.calculatePopularityTtl(30, 3600);
  const highHitsTtl = cacheService.calculatePopularityTtl(150, 3600);

  assert.strictEqual(lowHitsTtl, 3600);
  assert.strictEqual(midHitsTtl, 7200);
  assert.strictEqual(highHitsTtl, 14400);
});

test('DiscoveryRouter: circuit breaker trips to OPEN on threshold consecutive failures', () => {
  const router = new DiscoveryRouter();
  const breaker = router.breakers.get('mock');
  assert.ok(breaker);
  assert.strictEqual(breaker.state, 'CLOSED');
  assert.strictEqual(breaker.isOpen(), false);

  breaker.recordFailure();
  breaker.recordFailure();
  assert.strictEqual(breaker.state, 'CLOSED');

  breaker.recordFailure(); // 3rd failure trips breaker
  assert.strictEqual(breaker.state, 'OPEN');
  assert.strictEqual(breaker.isOpen(), true);

  // Recovery probe resets on success
  breaker.lastFailureTime = Date.now() - 70000; // Past reset timeout
  assert.strictEqual(breaker.isOpen(), false); // Transitions to HALF_OPEN
  assert.strictEqual(breaker.state, 'HALF_OPEN');

  breaker.recordSuccess();
  assert.strictEqual(breaker.state, 'CLOSED');
});

test('Provider Adapters: all mock adapters conform to base interface and return valid data', async () => {
  const mockDiscovery = new MockDiscoveryProvider();
  assert.strictEqual(mockDiscovery.isAvailable(), true);
  const searchResults = await mockDiscovery.search('iPhone 15');
  assert.ok(searchResults.length > 0);
  assert.strictEqual(searchResults[0].retailer, 'Amazon');

  const mockRetailer = new MockRetailerProvider();
  assert.strictEqual(mockRetailer.isAvailable(), true);
  const retailerResult = await mockRetailer.getOffer('B0EXAMPLE');
  assert.ok(retailerResult.price > 0);

  const mockHistory = new MockHistoryProvider();
  assert.strictEqual(mockHistory.isAvailable(), true);
  const historyResult = await mockHistory.getHistory('B0EXAMPLE');
  assert.ok(historyResult.length > 0);

  const mockIdentity = new MockIdentityProvider();
  assert.strictEqual(mockIdentity.isAvailable(), true);
  const identityResult = await mockIdentity.lookupProduct({ gtin: '1234567890123' });
  assert.ok(identityResult.title);

  const mockReview = new MockReviewProvider();
  assert.strictEqual(mockReview.isAvailable(), true);
  const reviewResult = await mockReview.getReviews('prod_1');
  assert.ok(reviewResult.snippets.length > 0);

  const mockAffiliate = new MockAffiliateLinkProvider();
  assert.strictEqual(mockAffiliate.isAvailable(), true);
  const deeplink = await mockAffiliate.generateDeeplink('https://www.amazon.in/dp/B0EXAMPLE', { subId: 'usr123' });
  assert.ok(deeplink.includes('aff_mock=pricepilot'));
  assert.ok(deeplink.includes('subid=usr123'));
});
