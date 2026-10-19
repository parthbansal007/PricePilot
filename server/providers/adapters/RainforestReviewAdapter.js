import ReviewProvider from '../ReviewProvider.js';

export default class RainforestReviewAdapter extends ReviewProvider {
  constructor(apiKey = null) {
    super('rainforest-reviews');
    this.apiKey = apiKey || process.env.RAINFOREST_API_KEY;
    this.baseUrl = 'https://api.rainforestapi.com/request';
  }

  isAvailable() {
    return Boolean(this.apiKey);
  }

  async getReviews(asin, options = {}) {
    if (!this.isAvailable()) {
      return { source: 'Amazon.in', rating: null, count: 0, snippets: [] };
    }

    const { timeoutMs = 10000 } = options;
    const url = new URL(this.baseUrl);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('type', 'reviews');
    url.searchParams.set('amazon_domain', 'amazon.in');
    url.searchParams.set('asin', asin);

    try {
      const response = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!response.ok) {
        return { source: 'Amazon.in', rating: null, count: 0, snippets: [] };
      }

      const data = await response.json();
      const reviews = data.reviews || [];
      const snippets = reviews.map(r => r.body || r.snippet).filter(Boolean).slice(0, 10);
      const rating = data.summary?.rating || null;
      const count = data.summary?.ratings_total || reviews.length;

      return {
        source: 'Amazon.in',
        rating,
        count,
        snippets
      };
    } catch (_err) {
      return { source: 'Amazon.in', rating: null, count: 0, snippets: [] };
    }
  }
}
