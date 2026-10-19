import DiscoveryProvider from '../DiscoveryProvider.js';
import { extractRetailerUrl, isDirectRetailerUrl } from '../../utils/urlUtils.js';
import { extractProductInfo, calculateMatchScore } from '../../utils/productMatcher.js';
import { isTrustedRetailer, isAccessoryTitle } from '../../utils/retailerFilter.js';

const extractPrice = (priceStr) => {
  if (typeof priceStr === 'number') return priceStr;
  if (!priceStr) return null;
  const num = parseFloat(String(priceStr).replace(/[^0-9.]/g, ''));
  return isNaN(num) ? null : num;
};

export default class SerpApiDiscoveryAdapter extends DiscoveryProvider {
  constructor(apiKey = null) {
    super('serpapi');
    this.apiKey = apiKey || process.env.SERPAPI_KEY || process.env.PRODUCT_SEARCH_API_KEY;
    this.baseUrl = 'https://serpapi.com/search.json';
  }

  isAvailable() {
    return Boolean(this.apiKey);
  }

  async search(query, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('SerpApiDiscoveryAdapter: Missing API key');
    }

    const { timeoutMs = 12000, limit = 20, gl = 'in', hl = 'en' } = options;

    const url = new URL(this.baseUrl);
    url.searchParams.set('engine', 'google_shopping');
    url.searchParams.set('q', query);
    url.searchParams.set('gl', gl);
    url.searchParams.set('hl', hl);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('num', String(limit));

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`SerpApi HTTP error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return this.normalizeResults(data, query);
  }

  normalizeResults(data, query = '') {
    const rawResults = Array.isArray(data) ? data : (data?.shopping_results || []);

    const normalized = [];
    for (const item of rawResults) {
      const source = item.source || item.merchant || 'Unknown Retailer';
      if (!item.title) continue;
      if (query && !isTrustedRetailer(source)) continue;
      if (query && isAccessoryTitle(item.title) && !isAccessoryTitle(query)) continue;

      const matchScore = query ? calculateMatchScore(query, item.title) : 100;
      if (query && matchScore < 35) continue;

      const rawUrl = item.link || item.product_link || '';
      const directUrl = extractRetailerUrl(rawUrl);
      const isDirect = isDirectRetailerUrl(directUrl);
      const price = item.extracted_price || extractPrice(item.price);
      const info = extractProductInfo(item.title);

      normalized.push({
        id: item.product_id ? `serp_${item.product_id}` : Buffer.from(item.title).toString('base64'),
        provider: 'serpapi',
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
