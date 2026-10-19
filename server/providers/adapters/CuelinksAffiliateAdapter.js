import AffiliateLinkProvider from '../AffiliateLinkProvider.js';
import { logger } from '../../utils/logger.js';

export default class CuelinksAffiliateAdapter extends AffiliateLinkProvider {
  constructor(apiKey = null) {
    super('cuelinks');
    this.apiKey = apiKey || process.env.CUELINKS_KEY;
    this.enabled = process.env.AFFILIATE_ENABLED === 'true';
    this.baseUrl = 'https://api.cuelinks.com/v2';
  }

  isAvailable() {
    return Boolean(this.enabled && this.apiKey);
  }

  async generateDeeplink(rawUrl, options = {}) {
    if (!this.isAvailable() || !rawUrl) {
      return rawUrl;
    }

    const { subId = 'web', timeoutMs = 5000 } = options;

    try {
      const response = await fetch(`${this.baseUrl}/links.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Token token="${this.apiKey}"`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          url: rawUrl,
          subid: subId
        }),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!response.ok) {
        return rawUrl;
      }

      const data = await response.json();
      return data.affiliate_url || rawUrl;
    } catch (err) {
      logger.warn({ error: err.message }, 'Cuelinks deeplink generation failed; falling back to direct URL');
      return rawUrl;
    }
  }

  async getOffers() {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/offers.json`, {
        headers: {
          'Authorization': `Token token="${this.apiKey}"`,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) return [];
      const data = await response.json();
      const offers = data.offers || [];

      return offers.map(o => ({
        id: String(o.id),
        retailer: o.merchant?.name || 'Retailer',
        title: o.title || '',
        couponCode: o.coupon_code || null,
        description: o.description || '',
        validTill: o.end_date || null,
        status: 'unverified'
      }));
    } catch (err) {
      return [];
    }
  }
}
