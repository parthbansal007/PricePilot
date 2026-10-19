import TrackedProduct from '../models/TrackedProduct.js';
import PriceHistory from '../models/PriceHistory.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getProductDetails } from '../services/productService.js';
import { acquireMongoLock } from '../models/JobLock.js';
import { logger } from '../utils/logger.js';

export const runPriceCheckJob = async () => {
  logger.info('Initiating price check job...');

  // 1. Acquire distributed lock to prevent overlapping job runs
  let releaseLock = null;
  try {
    releaseLock = await acquireMongoLock('price_check_job', 10 * 60 * 1000);
    if (!releaseLock) {
      logger.warn('Price check job skipped: previous job execution is still in progress.');
      return { success: false, message: 'Price check job already in progress' };
    }

    const activeProducts = await TrackedProduct.find({ active: true });
    if (activeProducts.length === 0) {
      logger.info('No active tracked products found.');
      return { success: true, message: 'No active tracked products.' };
    }

    const uniqueProductIds = [...new Set(activeProducts.map(p => p.productId.toString()))];
    let processedCount = 0;
    let priceUpdatesCount = 0;

    for (const productId of uniqueProductIds) {
      try {
        if (!process.env.PRODUCT_SEARCH_API_KEY && !process.env.SERPAPI_KEY && process.env.USE_MOCK_DATA !== 'true') {
          continue;
        }

        // Fetch latest price history entry for comparison
        const lastEntry = await PriceHistory.findOne({ productId }).sort({ timestamp: -1 });
        const previousPrice = lastEntry ? lastEntry.price : null;

        // Fetch current product details from provider
        const product = await getProductDetails(productId);
        if (!product || product.price === undefined || product.price === null || product.price <= 0) {
          continue;
        }

        processedCount++;
        const currentPrice = product.price;
        const now = new Date();

        // 2. Idempotent PriceHistory ingestion rule:
        // Record only if price changed OR once per 24 hours per product/offer
        const isPriceChanged = !lastEntry || lastEntry.price !== currentPrice;
        const isOlderThan24h = lastEntry && (now.getTime() - new Date(lastEntry.timestamp).getTime()) >= 24 * 60 * 60 * 1000;

        if (isPriceChanged || isOlderThan24h) {
          await PriceHistory.create({
            productId,
            price: currentPrice,
            currency: product.currency || 'INR',
            retailer: product.retailer || 'Unknown',
            timestamp: now
          });
          priceUpdatesCount++;
        }

        // Find all users actively tracking this product
        const trackingUsers = activeProducts.filter(p => p.productId.toString() === productId);

        for (const tracker of trackingUsers) {
          const user = await User.findOne({ firebaseUid: tracker.userId });
          const threshold = user?.notificationPreferences?.priceDropThreshold || 0;
          const emailAlertsEnabled = user?.notificationPreferences?.emailAlerts ?? true;

          // Check target price alert
          if (tracker.targetPrice && currentPrice <= tracker.targetPrice) {
            await Notification.create({
              userId: tracker.userId,
              type: 'TARGET_PRICE',
              title: 'Target Price Reached!',
              message: `${tracker.productName} has reached your target price of ₹${tracker.targetPrice}. Current price is ₹${currentPrice}.`,
              productId
            });

            if (emailAlertsEnabled && currentPrice <= (tracker.targetPrice - threshold)) {
              logger.info({ to: user?.email, currentPrice, targetPrice: tracker.targetPrice }, 'Dispatching target price email alert');
            }
          } else if (previousPrice !== null && currentPrice < previousPrice) {
            // Check price drop alert
            const dropAmount = previousPrice - currentPrice;
            await Notification.create({
              userId: tracker.userId,
              type: 'PRICE_DROP',
              title: 'Price Drop Alert',
              message: `${tracker.productName} has dropped by ₹${dropAmount.toFixed(2)}! New price: ₹${currentPrice}.`,
              productId
            });

            if (emailAlertsEnabled && dropAmount >= threshold) {
              logger.info({ to: user?.email, currentPrice, dropAmount }, 'Dispatching price drop email alert');
            }
          }
        }
      } catch (err) {
        logger.error({ productId, error: err.message }, 'Error checking product price in tracking job');
      }
    }

    logger.info({ processedCount, priceUpdatesCount }, 'Price check job completed successfully.');
    return {
      success: true,
      message: `Successfully processed ${processedCount} products with ${priceUpdatesCount} price history recordings.`
    };
  } catch (error) {
    logger.error({ error: error.message }, 'Fatal error during price check job');
    throw error;
  } finally {
    if (releaseLock) {
      await releaseLock();
    }
  }
};
