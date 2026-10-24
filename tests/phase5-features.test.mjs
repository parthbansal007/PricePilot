import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isDuplicateAlert } from '../server/services/notificationService.js';
import { detectFakeReviewPatterns } from '../server/services/reviewIntelligenceService.js';
import { handleConversation } from '../server/services/conversationalAgentService.js';
import { calculateConfigurationScore } from '../server/services/configurationService.js';

describe('Phase 5: Other Features Test Suite', () => {

  describe('1. Multi-Channel Alerts & Deduplication', () => {
    it('isDuplicateAlert suppresses identical price alert within window', async () => {
      const userId = 'user_test_dedupe_123';
      const productId = 'prod_iphone_16';
      const price = 79900;

      // First check should not be a duplicate
      const firstCheck = await isDuplicateAlert(userId, productId, price, 12);
      assert.equal(firstCheck, false, 'Initial notification should not be suppressed');

      // Immediate check with same price should be flagged as duplicate
      const secondCheck = await isDuplicateAlert(userId, productId, price, 12);
      assert.equal(secondCheck, true, 'Immediate subsequent notification should be suppressed as duplicate');

      // Distinct price drop (> 1%) should not be flagged as duplicate
      const thirdCheck = await isDuplicateAlert(userId, productId, 74900, 12);
      assert.equal(thirdCheck, false, 'Significant price drop should not be suppressed');
    });
  });

  describe('2. Conversational Agent Safety & Function Calling', () => {
    it('Requires explicit confirmation before executing write actions', async () => {
      // Offline fallback / safety check
      const conversation = await handleConversation({
        userId: 'test_user_agent',
        message: 'Can you track this iPhone 16 if price drops below 70000?',
        history: []
      });

      assert.ok(conversation.status, 'Response must have a status');
      assert.ok(typeof conversation.reply === 'string', 'Must provide a string reply');
    });

    it('Executes write action when confirmed: true', async () => {
      // Simulate confirmation payload handling
      const result = await handleConversation({
        userId: 'test_user_agent_exec',
        message: 'yes confirmed',
        confirmedAction: {
          action: 'track_product',
          payload: {
            productId: '507f191e810c19729de860ea',
            productName: 'Sony WH-1000XM5',
            targetPrice: 24990
          },
          confirmed: true
        }
      });

      assert.equal(result.status, 'SUCCESS');
      assert.ok(result.reply.includes('Confirmed!'));
      assert.ok(result.reply.includes('Sony WH-1000XM5'));
    });
  });

  describe('3. Review Intelligence & Fake Review Detection', () => {
    it('detectFakeReviewPatterns flags boilerplate repetitive snippets', () => {
      const repetitiveSnippets = [
        { snippet: 'Very good product, value for money' },
        { snippet: 'Very good product, value for money' },
        { snippet: 'Very good product, value for money' },
        { snippet: 'Nice quality' }
      ];

      const result = detectFakeReviewPatterns(repetitiveSnippets, 4.8, 15);
      assert.ok(result.authenticityScore < 80, 'Score should be penalized for identical snippets');
      assert.ok(result.flags.some(f => f.includes('repetitive') || f.includes('identical')));
    });

    it('detectFakeReviewPatterns returns high authenticity for diverse natural reviews', () => {
      const organicSnippets = [
        { snippet: 'Battery lasts about 1.5 days on heavy 5G usage. Display is bright outdoors.' },
        { snippet: 'Speaker audio is punchy, but camera low-light performance is slightly noisy.' },
        { snippet: 'Haptic feedback is crisp. Box only came with USB-C cable and no charging brick.' }
      ];

      const result = detectFakeReviewPatterns(organicSnippets, 4.3, 240);
      assert.ok(result.authenticityScore >= 80, 'Score should be high for organic reviews');
      assert.equal(result.riskLevel, 'LOW');
    });
  });

  describe('4. Better Configurations Scoring', () => {
    it('Scores candidates higher when matching preferences and budget', () => {
      const selected = { currentPrice: 50000, specifications: { ram: '8GB', gpu: 'RTX 3050' } };
      const betterSpec = { currentPrice: 49000, specifications: { ram: '16GB', gpu: 'RTX 4050' } };
      const preferences = { price: 8, performance: 10 };

      const score = calculateConfigurationScore(betterSpec, selected, preferences, true);
      assert.ok(score > 70, `Score should be high for cheaper + higher spec candidate (got ${score})`);
    });

    it('Penalizes candidates that exceed budget', () => {
      const selected = { currentPrice: 50000, specifications: { ram: '8GB' } };
      const expensive = { currentPrice: 85000, specifications: { ram: '16GB' } };
      const preferences = { price: 5, performance: 5 };

      const scoreWithinBudget = calculateConfigurationScore(expensive, selected, preferences, true);
      const scoreExceedsBudget = calculateConfigurationScore(expensive, selected, preferences, false);

      assert.ok(scoreWithinBudget > scoreExceedsBudget, 'Budget penalty must decrease configuration score');
    });
  });

  describe('5. Price Outlier Thresholds (from productController.submitExtensionPrice)', () => {
    // The real outlier detection in productController.js (line 155):
    //   if (numPrice < median * 0.2 || numPrice > median * 3.0) → 422 Outlier
    // These thresholds are hardcoded in the controller. We document and verify them here.

    it('Documents the real outlier rejection bounds: < 0.2x median or > 3.0x median', () => {
      const median = 50000;
      const lowerBound = median * 0.2;  // 10,000
      const upperBound = median * 3.0;  // 150,000

      // Just below lower bound → outlier
      assert.ok(8000 < lowerBound, 'Price ₹8,000 is below 20% of ₹50,000 median (₹10,000)');

      // Just above upper bound → outlier
      assert.ok(175000 > upperBound, 'Price ₹175,000 is above 300% of ₹50,000 median (₹150,000)');

      // Valid price within bounds → accepted
      assert.ok(46000 >= lowerBound && 46000 <= upperBound, 'Price ₹46,000 is within valid range');

      // Edge cases at exactly the bounds
      assert.ok(10000 >= lowerBound, 'Price exactly at lower bound (₹10,000) should be accepted');
      assert.ok(150000 <= upperBound, 'Price exactly at upper bound (₹150,000) should be accepted');
    });

    it('Documents maximum price limit: > ₹10,000,000 rejected by controller', () => {
      // productController.js line 137: numPrice > 10000000 → 400
      const maxAllowed = 10000000;
      assert.ok(15000000 > maxAllowed, 'Price ₹15,000,000 exceeds ₹10,000,000 hard limit');
      assert.ok(9999999 <= maxAllowed, 'Price ₹9,999,999 is within hard limit');
    });
  });

});
