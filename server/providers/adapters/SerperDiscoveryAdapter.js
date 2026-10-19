import DiscoveryProvider from '../DiscoveryProvider.js';
import { extractRetailerUrl, isDirectRetailerUrl } from '../../utils/urlUtils.js';
import { extractProductInfo, calculateMatchScore } from '../../utils/productMatcher.js';
import { isTrustedRetailer, isAccessoryTitle } from '../../utils/retailerFilter.js';

const extractPrice = (priceVal) => {
  if (typeof priceVal === 'number') return priceVal;
  if (!priceVal) return null;
  const num = parseFloat(String(priceVal).replace(/[^0-9.]/g, ''));
  return isNaN(num) ? null : num;
};

export default class SerperDiscoveryAdapter extends DiscoveryProvider {
  constructor(apiKey = null) {
    super('serper');
    this.apiKey = apiKey || process.env.SERPER_KEY;
    this.endpoint = 'https://google.serper.dev/shopping';
  }

  isAvailable() {
    return Boolean(this.apiKey);
  }

  async search(query, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('SerperDiscoveryAdapter: Missing SERPER_KEY');
    }

    const { timeoutMs = 12000, gl = 'in', hl = 'en' } = options;

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query, gl, hl }),
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`Serper HTTP error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const rawResults = data.shopping || [];

    const normalized = [];
    for (const item of rawResults) {
      const source = item.source || 'Unknown Retailer';
      if (!item.title || !isTrustedRetailer(source)) continue;
      if (isAccessoryTitle(item.title) && !isAccessoryTitle(query)) continue;

      const matchScore = calculateMatchScore(query, item.title);
      if (matchScore < 35) continue;

      const rawUrl = item.link || '';
      const directUrl = extractRetailerUrl(rawUrl);
      const isDirect = isDirectRetailerUrl(directUrl);
      const price = extractPrice(item.price);
      const info = extractProductInfo(item.title);

      normalized.push({
        id: item.productId ? `serper_${item.productId}` : Buffer.from(item.title).toString('base64'),
        provider: 'serper',
        title: item.title,
        brand: info.brand,
        model: info.model,
        modelNumber: info.modelNumber,
        price: price ? Math.round(price) : null,
        currency: 'INR',
        retailer: source,
        image: item.imageUrl || '',
        rating: item.rating || null,
        reviewCount: item.ratingCount || null,
        productUrl: directUrl,
        sourceUrl: rawUrl,
        isDirectRetailerUrl: isDirect,
        matchScore
      });
    }

    return normalized.sort((a, b) => b.matchScore - a.matchScore);
  }
}
