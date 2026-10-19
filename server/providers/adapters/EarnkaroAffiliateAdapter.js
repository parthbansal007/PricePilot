import AffiliateLinkProvider from '../AffiliateLinkProvider.js';

export default class EarnkaroAffiliateAdapter extends AffiliateLinkProvider {
  constructor(apiKey = null) {
    super('earnkaro');
    this.apiKey = apiKey || process.env.EARNKARO_KEY;
    this.enabled = process.env.AFFILIATE_ENABLED === 'true';
  }

  isAvailable() {
    return Boolean(this.enabled && this.apiKey);
  }

  async generateDeeplink(rawUrl, options = {}) {
    if (!this.isAvailable() || !rawUrl) {
      return rawUrl;
    }
    // Earnkaro link formatting
    return `https://earnkaro.com/deal?url=${encodeURIComponent(rawUrl)}`;
  }

  async getOffers() {
    return [];
  }
}
