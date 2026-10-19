import HistoryProvider from '../HistoryProvider.js';
import { logger } from '../../utils/logger.js';

const KEEPA_EPOCH_OFFSET_MINUTES = 21564000;
const AMAZON_IN_DOMAIN_ID = 10;

/**
 * Convert Keepa minute counter to standard JavaScript Date
 */
export const keepaTimeToDate = (keepaTime) => {
  const epochMs = (keepaTime + KEEPA_EPOCH_OFFSET_MINUTES) * 60000;
  return new Date(epochMs);
};

export default class KeepaHistoryAdapter extends HistoryProvider {
  constructor(apiKey = null) {
    super('keepa');
    this.apiKey = apiKey || process.env.KEEPA_KEY;
    this.baseUrl = 'https://api.keepa.com/product';
    this.tokensLeft = 300; // Tracked from response headers
  }

  isAvailable() {
    return Boolean(this.apiKey);
  }

  convertKeepaTimeToDate(keepaTime) {
    return keepaTimeToDate(keepaTime);
  }

  async getHistory(asin, options = {}) {
    if (!this.isAvailable()) {
      return [];
    }

    if (this.tokensLeft <= 5) {
      logger.warn({ tokensLeft: this.tokensLeft }, 'Keepa tokens near depletion; throttling backfill query');
      return [];
    }

    const { timeoutMs = 15000, days = 90 } = options;
    const url = new URL(this.baseUrl);
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('domain', String(AMAZON_IN_DOMAIN_ID));
    url.searchParams.set('asin', asin);
    url.searchParams.set('history', '1');
    url.searchParams.set('days', String(days));

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`Keepa API error HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.tokensLeft !== undefined) {
      this.tokensLeft = data.tokensLeft;
    }

    const product = data.products?.[0];
    if (!product || !product.csv) {
      return [];
    }

    // Keepa CSV array index 0 is Amazon direct, index 1 is New Marketplace
    // CSV format: [time1, price1, time2, price2, ...]
    const amazonCsv = product.csv[0] || [];
    const newMarketplaceCsv = product.csv[1] || [];
    const sourceCsv = amazonCsv.length > 0 ? amazonCsv : newMarketplaceCsv;

    const historyPoints = [];
    for (let i = 0; i < sourceCsv.length; i += 2) {
      const keepaTime = sourceCsv[i];
      const rawPrice = sourceCsv[i + 1];

      // Keepa uses -1 for out-of-stock / unlisted
      if (rawPrice && rawPrice > 0) {
        const date = keepaTimeToDate(keepaTime);
        historyPoints.push({
          timestamp: date,
          price: rawPrice, // Keepa domain 10 is in INR Rupees
          currency: 'INR',
          retailer: 'Amazon',
          source: 'keepa',
          sourceType: 'backfill'
        });
      }
    }

    return historyPoints;
  }
}
