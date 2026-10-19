import DiscoveryProvider from '../DiscoveryProvider.js';
import { extractRetailerUrl, isDirectRetailerUrl } from '../../utils/urlUtils.js';
import { extractProductInfo, calculateMatchScore } from '../../utils/productMatcher.js';
import { isTrustedRetailer, isAccessoryTitle } from '../../utils/retailerFilter.js';

export default class DataForSeoDiscoveryAdapter extends DiscoveryProvider {
  constructor(login = null, password = null) {
    super('dataforseo');
    this.login = login || process.env.DATAFORSEO_LOGIN;
    this.password = password || process.env.DATAFORSEO_PASSWORD;
    this.endpoint = 'https://api.dataforseo.com/v3/merchant/google/products/live/advanced';
  }

  isAvailable() {
    return Boolean(this.login && this.password);
  }

  async search(query, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('DataForSeoDiscoveryAdapter: Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD');
    }

    const { timeoutMs = 15000, locationCode = 2356, languageCode = 'en' } = options;
    const authHeader = 'Basic ' + Buffer.from(`${this.login}:${this.password}`).toString('base64');

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        {
          keyword: query,
          location_code: locationCode, // India
          language_code: languageCode
        }
      ]),
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`DataForSEO HTTP error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const task = data.tasks?.[0];
    if (task?.status_code >= 40000) {
      throw new Error(`DataForSEO error: ${task.status_message}`);
    }

    const items = task?.result?.[0]?.items || [];
    const normalized = [];

    for (const item of items) {
      const source = item.seller || item.source || 'Unknown Retailer';
      if (!item.title || !isTrustedRetailer(source)) continue;
      if (isAccessoryTitle(item.title) && !isAccessoryTitle(query)) continue;

      const matchScore = calculateMatchScore(query, item.title);
      if (matchScore < 35) continue;

      const rawUrl = item.url || '';
      const directUrl = extractRetailerUrl(rawUrl);
      const isDirect = isDirectRetailerUrl(directUrl);
      const info = extractProductInfo(item.title);

      normalized.push({
        id: item.product_id ? `dfseo_${item.product_id}` : Buffer.from(item.title).toString('base64'),
        provider: 'dataforseo',
        title: item.title,
        brand: info.brand,
        model: info.model,
        modelNumber: info.modelNumber,
        price: item.price ? Math.round(item.price) : null,
        currency: item.currency || 'INR',
        retailer: source,
        image: item.image_url || '',
        rating: item.rating?.value || null,
        reviewCount: item.rating?.votes_count || null,
        productUrl: directUrl,
        sourceUrl: rawUrl,
        isDirectRetailerUrl: isDirect,
        matchScore
      });
    }

    return normalized.sort((a, b) => b.matchScore - a.matchScore);
  }
}
