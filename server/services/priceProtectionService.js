import PriceProtection from '../models/PriceProtection.js';
import { getProductDetails } from './productService.js';
import { dispatchNotification } from './notificationService.js';
import logger from '../utils/logger.js';

/**
 * Register post-purchase price protection
 */
export async function registerPriceProtection(userId, {
  productId,
  productTitle,
  purchasePrice,
  purchaseDate = new Date(),
  protectionDays = 14,
  retailer = 'Amazon.in',
  orderId = ''
}) {
  const pDate = new Date(purchaseDate);
  const expiresAt = new Date(pDate.getTime() + protectionDays * 24 * 60 * 60 * 1000);

  const protection = await PriceProtection.create({
    userId,
    productId,
    productTitle,
    purchasePrice,
    purchaseDate: pDate,
    protectionDays,
    expiresAt,
    retailer,
    orderId,
    lowestPriceSeen: purchasePrice,
    potentialRefund: 0,
    status: 'ACTIVE'
  });

  return protection;
}

/**
 * Fetch all active or historical protections for a user
 */
export async function getUserProtections(userId) {
  return PriceProtection.find({ userId }).sort({ createdAt: -1 });
}

/**
 * Scan active protections and alert on price drops
 */
export async function checkActiveProtections() {
  const now = new Date();
  const activeProtections = await PriceProtection.find({
    status: 'ACTIVE',
    expiresAt: { $gte: now }
  });

  logger.info({ count: activeProtections.length }, 'Scanning active price protections');
  const results = [];

  for (const item of activeProtections) {
    try {
      const details = await getProductDetails(item.productId);
      const currentPrice = details?.price || details?.currentPrice;

      if (currentPrice && currentPrice < item.lowestPriceSeen) {
        const potentialRefund = item.purchasePrice - currentPrice;
        item.lowestPriceSeen = currentPrice;
        item.potentialRefund = potentialRefund;
        item.lastCheckedAt = now;
        await item.save();

        // Dispatch alert via notification service
        await dispatchNotification(item.userId, {
          type: 'PRICE_DROP',
          title: `Price Protection Drop: Save ₹${potentialRefund.toLocaleString('en-IN')}!`,
          message: `The price for "${item.productTitle}" dropped to ₹${currentPrice.toLocaleString('en-IN')} (you bought it at ₹${item.purchasePrice.toLocaleString('en-IN')}). Your price protection window expires on ${item.expiresAt.toLocaleDateString('en-IN')}.`,
          productId: item.productId,
          currentPrice,
          targetPrice: item.purchasePrice,
          retailer: item.retailer
        });

        results.push({ id: item._id, dropped: true, currentPrice, potentialRefund });
      } else {
        item.lastCheckedAt = now;
        await item.save();
        results.push({ id: item._id, dropped: false });
      }
    } catch (err) {
      logger.warn({ id: item._id, err: err.message }, 'Failed to check price protection item');
    }
  }

  // Auto-expire items past protection window
  await PriceProtection.updateMany(
    { status: 'ACTIVE', expiresAt: { $lt: now } },
    { $set: { status: 'EXPIRED' } }
  );

  return results;
}

export default {
  registerPriceProtection,
  getUserProtections,
  checkActiveProtections
};
