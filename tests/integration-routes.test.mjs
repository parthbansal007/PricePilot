import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { unwrapDirectUrl } from '../server/utils/urlUtils.js';
import { normalizeProductTitle, extractProductInfo, hasConflict, calculateMatchScore } from '../server/utils/productMatcher.js';
import SerpApiDiscoveryAdapter from '../server/providers/adapters/SerpApiDiscoveryAdapter.js';
import SerperDiscoveryAdapter from '../server/providers/adapters/SerperDiscoveryAdapter.js';
import SearchApiDiscoveryAdapter from '../server/providers/adapters/SearchApiDiscoveryAdapter.js';
import KeepaHistoryAdapter from '../server/providers/adapters/KeepaHistoryAdapter.js';

describe('Phase 6: Integration & Normalization Test Suite', () => {

  describe('1. urlUtils Direct Link Unwrapping', () => {
    it('unwraps Google redirect URLs to direct merchant destination', () => {
      const googleRedirect = 'https://www.google.com/url?url=https%3A%2F%2Fwww.amazon.in%2Fdp%2FB0DGHQ4V9R&rct=j&q=&esrc=s';
      const direct = unwrapDirectUrl(googleRedirect);
      assert.equal(direct, 'https://www.amazon.in/dp/B0DGHQ4V9R');
    });

    it('strips tracking and affiliate query params cleanly', () => {
      const dirtyUrl = 'https://www.flipkart.com/apple-iphone-16-white-128-gb/p/itme?utm_source=google&utm_medium=cpc&gclid=12345&tag=aff-21';
      const clean = unwrapDirectUrl(dirtyUrl);
      assert.ok(!clean.includes('utm_source'), 'Should remove utm_source');
      assert.ok(!clean.includes('gclid'), 'Should remove gclid');
      assert.ok(!clean.includes('tag='), 'Should remove partner tag');
    });
  });

  describe('2. productMatcher Canonical Resolution', () => {
    it('matches the same product from different retailers with high score', () => {
      const amazonTitle = 'Apple iPhone 16 (128 GB) - Teal';
      const flipkartTitle = 'Apple iPhone 16 (Teal, 128 GB)';

      const score = calculateMatchScore(amazonTitle, flipkartTitle);
      assert.ok(score >= 50, `Score should be high for matching items (got ${score})`);
    });

    it('flags conflict between incompatible models or product families', () => {
      const infoLenovoPro5 = extractProductInfo('Lenovo Legion Pro 5 16IRX9');
      const infoLenovoPro7 = extractProductInfo('Lenovo Legion Pro 7 16IRX9');

      assert.equal(hasConflict(infoLenovoPro5, infoLenovoPro7), true, 'Pro 5 vs Pro 7 must conflict');
    });

    it('normalizes product titles consistently', () => {
      const normalized = normalizeProductTitle('  Sony WH-1000XM5 (Wireless, Noise-Cancelling)  ');
      assert.ok(!normalized.includes('('));
      assert.ok(!normalized.includes(')'));
      assert.ok(normalized.includes('sony wh-1000xm5'));
    });
  });

  describe('3. Adapter Response Normalization via Fixtures', () => {
    it('SerpApiDiscoveryAdapter normalizes raw SERP shopping results', () => {
      const adapter = new SerpApiDiscoveryAdapter();
      const rawFixture = {
        shopping_results: [
          {
            title: 'OnePlus 12 5G (Flowy Emerald, 256 GB)',
            price: '₹64,999.00',
            extracted_price: 64999,
            link: 'https://www.amazon.in/dp/B0CQPPFV3H',
            source: 'Amazon.in',
            rating: 4.5,
            reviews: 1200,
            thumbnail: 'https://example.com/oneplus.jpg'
          }
        ]
      };

      const normalized = adapter.normalizeResults(rawFixture);
      assert.equal(normalized.length, 1);
      assert.equal(normalized[0].title, 'OnePlus 12 5G (Flowy Emerald, 256 GB)');
      assert.equal(normalized[0].price, 64999);
      assert.equal(normalized[0].retailer, 'Amazon.in');
      assert.equal(normalized[0].rating, 4.5);
    });

    it('SerperDiscoveryAdapter normalizes Serper shopping payload', () => {
      const adapter = new SerperDiscoveryAdapter();
      const rawFixture = {
        shopping: [
          {
            title: 'Samsung Galaxy S24 Ultra 5G',
            price: '₹1,29,999',
            link: 'https://www.samsung.com/in/smartphones/galaxy-s24-ultra/',
            source: 'Samsung India',
            rating: 4.7,
            ratingCount: 850,
            imageUrl: 'https://example.com/s24.jpg'
          }
        ]
      };

      const normalized = adapter.normalizeResults(rawFixture);
      assert.equal(normalized.length, 1);
      assert.equal(normalized[0].price, 129999);
      assert.equal(normalized[0].retailer, 'Samsung India');
      assert.equal(normalized[0].rating, 4.7);
    });

    it('SearchApiDiscoveryAdapter normalizes SearchApi items', () => {
      const adapter = new SearchApiDiscoveryAdapter();
      const rawFixture = {
        shopping_results: [
          {
            title: 'MacBook Air 13 M3 8GB 256GB',
            price: '₹1,04,900',
            extracted_price: 104900,
            product_link: 'https://www.croma.com/p/305284',
            source: 'Croma',
            rating: 4.8,
            reviews: 320
          }
        ]
      };

      const normalized = adapter.normalizeResults(rawFixture);
      assert.equal(normalized.length, 1);
      assert.equal(normalized[0].price, 104900);
      assert.equal(normalized[0].retailer, 'Croma');
    });

    it('KeepaHistoryAdapter converts Keepa timestamps accurately', () => {
      const adapter = new KeepaHistoryAdapter();
      // Keepa time: minutes since 2011-01-01T00:00:00Z
      // 0 minutes = 2011-01-01T00:00:00.000Z
      const keepaTime = 0;
      const date = adapter.convertKeepaTimeToDate(keepaTime);
      assert.equal(date.toISOString(), '2011-01-01T00:00:00.000Z');

      // 525600 minutes = 1 non-leap year later = 2012-01-01T00:00:00.000Z
      const date1Year = adapter.convertKeepaTimeToDate(525600);
      assert.equal(date1Year.toISOString(), '2012-01-01T00:00:00.000Z');
    });
  });

});
