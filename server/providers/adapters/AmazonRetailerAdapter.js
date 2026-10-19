import RetailerProvider from '../RetailerProvider.js';

/**
 * Amazon India Creators API Adapter
 * Note: Amazon PA-API 5.0 is deprecated. This adapter targets the Amazon Creators API OAuth 2.0 flow.
 * Status: UNVERIFIED (Awaiting account credentials approval).
 */
export default class AmazonRetailerAdapter extends RetailerProvider {
  constructor() {
    super('amazon');
    this.credentialId = process.env.AMAZON_CREDENTIAL_ID;
    this.credentialSecret = process.env.AMAZON_CREDENTIAL_SECRET;
    this.associateTag = process.env.AMAZON_ASSOCIATE_TAG;
    this.cachedToken = null;
    this.tokenExpiry = null;
  }

  isAvailable() {
    return Boolean(this.credentialId && this.credentialSecret && this.associateTag);
  }

  async getAccessToken() {
    if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    // Exchange credential ID and Secret via OAuth 2.0 endpoint
    const tokenUrl = 'https://api.amazon.com/auth/o2/token';
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.credentialId,
      client_secret: this.credentialSecret,
      scope: 'creatorsapi'
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!res.ok) {
      throw new Error(`Amazon OAuth token failure HTTP ${res.status}`);
    }

    const data = await res.json();
    this.cachedToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this.cachedToken;
  }

  async getOffer(asin, options = {}) {
    if (!this.isAvailable()) {
      return null;
    }

    const token = await this.getAccessToken();
    const { timeoutMs = 8000 } = options;

    const endpoint = 'https://api.amazon.in/creatorsapi/v1/items';
    const res = await fetch(`${endpoint}?itemIds=${encodeURIComponent(asin)}&partnerTag=${encodeURIComponent(this.associateTag)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) {
      throw new Error(`Amazon Creators API HTTP ${res.status}`);
    }

    const data = await res.json();
    const item = data.itemsResult?.items?.[0];
    if (!item) return null;

    const listingPrice = item.offersV2?.listings?.[0]?.price?.amount;
    const mrp = item.offersV2?.listings?.[0]?.savingBasis?.amount;

    return {
      retailer: 'Amazon',
      price: listingPrice ? Math.round(listingPrice) : null,
      mrp: mrp ? Math.round(mrp) : null,
      currency: 'INR',
      url: item.detailPageUrl || `https://www.amazon.in/dp/${asin}?tag=${this.associateTag}`,
      isDirectRetailerUrl: true,
      availability: item.offersV2?.listings?.[0]?.availability?.message || 'In Stock',
      source: 'retailer-api',
      trustLevel: 'high'
    };
  }
}
