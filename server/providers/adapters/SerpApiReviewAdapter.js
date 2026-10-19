import ReviewProvider from '../ReviewProvider.js';

export default class SerpApiReviewAdapter extends ReviewProvider {
  constructor(apiKey = null) {
    super('serpapi-reviews');
    this.apiKey = apiKey || process.env.SERPAPI_KEY || process.env.PRODUCT_SEARCH_API_KEY;
    this.baseUrl = 'https://serpapi.com/search.json';
  }

  isAvailable() {
    return Boolean(this.apiKey);
  }

  async getReviews(productId, options = {}) {
    if (!this.isAvailable()) {
      return { source: 'Google Shopping', rating: null, count: 0, snippets: [] };
    }

    const { timeoutMs = 8000 } = options;
    const url = new URL(this.baseUrl);
    url.searchParams.set('engine', 'google_product_reviews');
    url.searchParams.set('product_id', productId);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('gl', 'in');
    url.searchParams.set('hl', 'en');

    try {
      const response = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!response.ok) {
        return { source: 'Google Shopping', rating: null, count: 0, snippets: [] };
      }

      const data = await response.json();
      const reviews = data.reviews || [];
      const snippets = reviews.map(r => r.content || r.snippet).filter(Boolean).slice(0, 10);
      const rating = data.product_results?.rating || null;
      const count = data.product_results?.reviews || reviews.length;

      return {
        source: 'Google Shopping',
        rating,
        count,
        snippets
      };
    } catch (_err) {
      return { source: 'Google Shopping', rating: null, count: 0, snippets: [] };
    }
  }
}
