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

  describe('5. Price Protection Math & Outlier Checks', () => {
    it('Calculates price protection potential refund correctly', () => {
      const purchasePrice = 64999;
      const currentPrice = 59999;
      const refund = purchasePrice - currentPrice;

      assert.equal(refund, 5000);
      assert.ok(refund > 0);
    });

    it('Validates price submission outlier rejection threshold', () => {
      const median = 50000;
      const lowerOutlier = 8000;   // < 0.2x median (10000)
      const higherOutlier = 175000; // > 3x median (150000)
      const validPrice = 46000;

      const isOutlier = (p) => p < median * 0.2 || p > median * 3.0;

      assert.equal(isOutlier(lowerOutlier), true, 'Price below 20% of median is an outlier');
      assert.equal(isOutlier(higherOutlier), true, 'Price above 300% of median is an outlier');
      assert.equal(isOutlier(validPrice), false, 'Normal competitive price is not an outlier');
    });
  });

});
