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

export default class SearchApiDiscoveryAdapter extends DiscoveryProvider {
  constructor(apiKey = null) {
    super('searchapi');
    this.apiKey = apiKey || process.env.SEARCHAPI_KEY;
    this.endpoint = 'https://www.searchapi.io/api/v1/search';
  }

  isAvailable() {
    return Boolean(this.apiKey);
  }

  async search(query, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('SearchApiDiscoveryAdapter: Missing SEARCHAPI_KEY');
    }

    const { timeoutMs = 12000, gl = 'in', hl = 'en' } = options;

    const url = new URL(this.endpoint);
    url.searchParams.set('engine', 'google_shopping');
    url.searchParams.set('q', query);
    url.searchParams.set('gl', gl);
    url.searchParams.set('hl', hl);
    url.searchParams.set('link', 'resolved');
    url.searchParams.set('api_key', this.apiKey);

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`SearchAPI HTTP error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const rawResults = data.shopping_results || [];

    const normalized = [];
    for (const item of rawResults) {
      const source = item.source || item.merchant?.name || 'Unknown Retailer';
      if (!item.title || !isTrustedRetailer(source)) continue;
      if (isAccessoryTitle(item.title) && !isAccessoryTitle(query)) continue;

      const matchScore = calculateMatchScore(query, item.title);
      if (matchScore < 35) continue;

      const rawUrl = item.product_link || item.merchant?.link || item.link || '';
      const directUrl = extractRetailerUrl(rawUrl);
      const isDirect = isDirectRetailerUrl(directUrl);
      const price = item.extracted_price || extractPrice(item.price);
      const info = extractProductInfo(item.title);

      normalized.push({
        id: item.product_token ? `sapi_${item.product_token}` : Buffer.from(item.title).toString('base64'),
        provider: 'searchapi',
        title: item.title,
        brand: info.brand,
        model: info.model,
        modelNumber: info.modelNumber,
        price: price ? Math.round(price) : null,
        currency: 'INR',
        retailer: source,
        image: item.thumbnail || '',
        rating: item.rating || null,
        reviewCount: item.reviews || null,
        productUrl: directUrl,
        sourceUrl: rawUrl,
        isDirectRetailerUrl: isDirect,
        matchScore
      });
    }

    return normalized.sort((a, b) => b.matchScore - a.matchScore);
  }
}
