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
    let results = this.normalizeResults(data, query);

    // If shopping search yielded fewer than 2 trusted matches, try organic search for direct store links
    if (results.length < 2) {
      try {
        const organicResults = await this.searchOrganicStoreLinks(query, options);
        if (organicResults && organicResults.length > 0) {
          results = [...results, ...organicResults];
        }
      } catch (e) {
        // Non-fatal fallback
      }
    }

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  async searchOrganicStoreLinks(query, options = {}) {
    const { timeoutMs = 10000, gl = 'in', hl = 'en' } = options;
    const url = new URL(this.baseUrl);
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', `buy ${query} online india`);
    url.searchParams.set('google_domain', 'google.co.in');
    url.searchParams.set('gl', gl);
    url.searchParams.set('hl', hl);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('num', '15');

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) return [];
    const data = await response.json();
    const organicItems = [];

    // 1. Organic Results from trusted retail domains
    for (const org of (data.organic_results || [])) {
      const retailer = domainToRetailer(org.link);
      if (!retailer) continue;
      const title = org.title || query;
      const matchScore = calculateMatchScore(query, title);
      if (matchScore < 30) continue;

      const priceMatch = (org.snippet || '').match(/(?:₹|rs\.?)\s*(\d{1,3}(?:,\d{3})+|\d{4,6})/i);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : null;
      const directUrl = extractRetailerUrl(org.link, retailer, title);
      const info = extractProductInfo(title);

      organicItems.push({
        id: `serp_org_${Buffer.from(org.link).toString('base64').slice(0, 16)}`,
        provider: 'serpapi',
        title,
        brand: info.brand,
        model: info.model,
        modelNumber: info.modelNumber,
        price,
        currency: 'INR',
        retailer,
        image: '',
        rating: 4.5,
        reviewCount: 150,
        productUrl: directUrl,
        sourceUrl: org.link,
        isDirectRetailerUrl: true,
        matchScore
      });
    }

    // 2. Product Result Stores if available in organic response
    if (data.product_result && Array.isArray(data.product_result.stores)) {
      for (const store of data.product_result.stores) {
        const source = store.name || 'Store';
        const title = store.description || data.product_result.title || query;
        const directUrl = extractRetailerUrl(store.link, source, title);
        const price = store.extracted_price || extractPrice(store.price);
        const info = extractProductInfo(title);

        organicItems.push({
          id: `serp_store_${Buffer.from(source + title).toString('base64').slice(0, 16)}`,
          provider: 'serpapi',
          title,
          brand: info.brand,
          model: info.model,
          modelNumber: info.modelNumber,
          price: price ? Math.round(price) : null,
          currency: 'INR',
          retailer: source,
          image: store.thumbnail || '',
          rating: 4.6,
          reviewCount: 100,
          productUrl: directUrl,
          sourceUrl: store.link,
          isDirectRetailerUrl: true,
          matchScore: 95
        });
      }
    }

    return organicItems;
  }

  normalizeResults(data, query = '') {
    const rawResults = Array.isArray(data) ? data : (data?.shopping_results || []);
    const normalized = [];

    // 1. Process regular shopping results
    for (const item of rawResults) {
      const source = item.source || item.merchant || 'Unknown Retailer';
      if (!item.title) continue;
      if (query && !isTrustedRetailer(source)) continue;
      if (query && isAccessoryTitle(item.title) && !isAccessoryTitle(query)) continue;

      const matchScore = query ? calculateMatchScore(query, item.title) : 100;
      if (query && matchScore < 30) continue;

      const rawUrl = item.link || item.product_link || '';
      const directUrl = extractRetailerUrl(rawUrl, source, item.title);
      const isDirect = isDirectRetailerUrl(directUrl);
      const price = item.extracted_price || extractPrice(item.price);
      const info = extractProductInfo(item.title);

      normalized.push({
        id: item.product_id ? `serp_${item.product_id}` : Buffer.from(item.title + source).toString('base64').slice(0, 24),
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

    // 2. Process product_result stores if present
    if (data.product_result && Array.isArray(data.product_result.stores)) {
      for (const store of data.product_result.stores) {
        const source = store.name || 'Store';
        if (!isTrustedRetailer(source)) continue;
        const title = store.description || data.product_result.title || query;
        const directUrl = extractRetailerUrl(store.link, source, title);
        const price = store.extracted_price || extractPrice(store.price);
        const info = extractProductInfo(title);

        normalized.push({
          id: `serp_store_${Buffer.from(source + title).toString('base64').slice(0, 24)}`,
          provider: 'serpapi',
          title,
          brand: info.brand,
          model: info.model,
          modelNumber: info.modelNumber,
          price: price ? Math.round(price) : null,
          currency: 'INR',
          retailer: source,
          image: store.thumbnail || data.product_result.thumbnails?.[0] || '',
          rating: data.product_result.reviews_results?.user_reviews?.rating || 4.5,
          reviewCount: data.product_result.reviews_results?.user_reviews?.reviews || 100,
          productUrl: directUrl,
          sourceUrl: store.link,
          isDirectRetailerUrl: true,
          matchScore: 95
        });
      }
    }

    return normalized;
  }
}
