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

const domainToRetailer = (url) => {
  if (!url) return null;
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h.includes('amazon')) return 'Amazon';
    if (h.includes('flipkart')) return 'Flipkart';
    if (h.includes('croma')) return 'Croma';
    if (h.includes('reliancedigital')) return 'Reliance Digital';
    if (h.includes('vijaysales')) return 'Vijay Sales';
    if (h.includes('zepto')) return 'Zepto';
    if (h.includes('blinkit')) return 'Blinkit';
    if (h.includes('bigbasket')) return 'BigBasket';
    if (h.includes('tatacliq')) return 'Tata CLiQ';
    if (h.includes('jiomart')) return 'JioMart';
    if (h.includes('apple')) return 'Apple';
    if (h.includes('samsung')) return 'Samsung';
    if (h.includes('poorvika')) return 'Poorvika';
    if (h.includes('sangeetha')) return 'Sangeetha';
    return null;
  } catch {
    return null;
  }
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

    const { timeoutMs = 15000, limit = 40, gl = 'in', hl = 'en' } = options;

    const url = new URL(this.baseUrl);
    url.searchParams.set('engine', 'google_shopping');
    url.searchParams.set('q', query);
    url.searchParams.set('google_domain', 'google.co.in');
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
    const results = this.normalizeResults(data, query);

    return results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }

  normalizeResults(data, query = '') {
    const rawResults = Array.isArray(data) 
      ? data 
      : [
          ...(data?.shopping_results || []),
          ...(data?.immersive_products || [])
        ];
    const normalized = [];
    const seenOffers = new Set();

    // 1. Process regular shopping results
    for (const item of rawResults) {
      if (!item.title) continue;

      const price = item.extracted_price || extractPrice(item.price);
      // Skip items without a valid price
      if (!price || price <= 0) continue;

      const source = item.source || item.merchant || 'Unknown Retailer';

      // Only filter accessories if the user wasn't searching for an accessory
      if (query && isAccessoryTitle(item.title) && !isAccessoryTitle(query)) continue;

      let matchScore = query ? calculateMatchScore(query, item.title) : 100;
      if (query && matchScore < 20) continue;

      // Boost trusted retailers so top stores appear higher without discarding niche/specialty stores
      if (isTrustedRetailer(source)) {
        matchScore += 20;
      }

      const rawUrl = item.link || item.product_link || '';
      const directUrl = extractRetailerUrl(rawUrl, source, item.title);
      const isDirect = isDirectRetailerUrl(directUrl);
      const info = extractProductInfo(item.title);
      const image = item.thumbnail || item.serpapi_thumbnail || '';

      const dedupKey = `${(item.title || '').toLowerCase()}::${(source || '').toLowerCase()}::${Math.round(price)}`;
      if (seenOffers.has(dedupKey)) continue;
      seenOffers.add(dedupKey);

      normalized.push({
        id: item.product_id ? `serp_${item.product_id}` : Buffer.from(item.title + source).toString('base64').slice(0, 24),
        provider: 'serpapi',
        title: item.title,
        brand: info.brand || 'Brand',
        model: info.model,
        modelNumber: info.modelNumber,
        price: Math.round(price),
        currency: 'INR',
        retailer: source,
        image,
        rating: item.rating || 4.5,
        reviewCount: item.reviews || 50,
        productUrl: directUrl,
        sourceUrl: rawUrl,
        isDirectRetailerUrl: isDirect,
        matchScore
      });
    }

    // 2. Process product_result stores if present
    if (data.product_result && Array.isArray(data.product_result.stores)) {
      for (const store of data.product_result.stores) {
        const source = store.name || 'Store';
        const title = store.description || data.product_result.title || query;
        const price = store.extracted_price || extractPrice(store.price);
        if (!price || price <= 0) continue;

        const directUrl = extractRetailerUrl(store.link, source, title);
        const info = extractProductInfo(title);
        const image = store.thumbnail || (data.product_result.thumbnails && data.product_result.thumbnails[0]) || '';

        let matchScore = 95;
        if (isTrustedRetailer(source)) {
          matchScore += 10;
        }

        const dedupKey = `${title.toLowerCase()}::${source.toLowerCase()}::${Math.round(price)}`;
        if (seenOffers.has(dedupKey)) continue;
        seenOffers.add(dedupKey);

        normalized.push({
          id: `serp_store_${Buffer.from(source + title).toString('base64').slice(0, 24)}`,
          provider: 'serpapi',
          title,
          brand: info.brand || 'Brand',
          model: info.model,
          modelNumber: info.modelNumber,
          price: Math.round(price),
          currency: 'INR',
          retailer: source,
          image,
          rating: data.product_result.reviews_results?.user_reviews?.rating || 4.5,
          reviewCount: data.product_result.reviews_results?.user_reviews?.reviews || 100,
          productUrl: directUrl,
          sourceUrl: store.link,
          isDirectRetailerUrl: true,
          matchScore
        });
      }
    }

    return normalized;
  }
}
