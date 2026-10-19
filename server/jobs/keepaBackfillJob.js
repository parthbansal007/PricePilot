import KeepaHistoryAdapter from '../providers/adapters/KeepaHistoryAdapter.js';
import PriceHistory from '../models/PriceHistory.js';
import logger from '../utils/logger.js';

const keepaAdapter = new KeepaHistoryAdapter();

/**
 * Backfills 90-day price history for an ASIN if available and not already backfilled
 * Throttles against Keepa token consumption
 * @param {string|mongoose.Types.ObjectId} canonicalProductId
 * @param {string} asin
 */
export async function backfillProductHistory(canonicalProductId, asin) {
  if (!asin || !canonicalProductId) {
    return { backfilled: 0, reason: 'Missing ASIN or Product ID' };
  }

  if (!keepaAdapter.isAvailable()) {
    return { backfilled: 0, reason: 'Keepa API key not configured' };
  }

  try {
    // 1. Check if we already backfilled this product recently (within 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const existing = await PriceHistory.findOne({
      productId: canonicalProductId,
      sourceType: 'backfill',
      createdAt: { $gte: sevenDaysAgo }
    }).lean();

    if (existing) {
      logger.debug({ canonicalProductId, asin }, 'Keepa price history already backfilled recently');
      return { backfilled: 0, reason: 'Recently backfilled' };
    }

    // 2. Fetch history from Keepa (90 days)
    logger.info({ canonicalProductId, asin }, 'Initiating Keepa history backfill');
    const points = await keepaAdapter.getHistory(asin, { days: 90 });

    if (!points || points.length === 0) {
      return { backfilled: 0, reason: 'No Keepa history data' };
    }

    // 3. Batch insert points
    const docs = points.map(pt => ({
      productId: canonicalProductId,
      price: pt.price,
      currency: pt.currency || 'INR',
      retailer: pt.retailer || 'Amazon',
      timestamp: pt.timestamp,
      source: 'keepa',
      sourceType: 'backfill'
    }));

    // Use ordered: false to continue past potential duplicate key collisions
    const result = await PriceHistory.insertMany(docs, { ordered: false });

    logger.info(
      { canonicalProductId, asin, count: result.length },
      'Successfully backfilled Keepa price history'
    );

    return { backfilled: result.length, reason: 'Success' };
  } catch (err) {
    logger.warn({ canonicalProductId, asin, error: err.message }, 'Keepa backfill failed');
    return { backfilled: 0, reason: err.message };
  }
}

export default { backfillProductHistory };
