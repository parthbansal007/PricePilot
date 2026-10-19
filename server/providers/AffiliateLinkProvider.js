/**
 * Base AffiliateLinkProvider Interface
 * Provides deeplink generation and coupon/offer feeds
 * Disabled by default. Links must never alter displayed price or product ranking.
 */
export default class AffiliateLinkProvider {
  constructor(name) {
    this.name = name;
  }

  isAvailable() {
    return false;
  }

  /**
   * Convert retailer URL to monetized tracking deeplink
   * @param {string} rawUrl - Retailer product URL
   * @param {Object} options - { subId }
   * @returns {Promise<string>} Tracked affiliate link
   */
  async generateDeeplink(_rawUrl, _options = {}) {
    throw new Error(`generateDeeplink() not implemented on ${this.name}`);
  }

  /**
   * Fetch active offers & coupons feed
   * @returns {Promise<Array>} Array of { couponCode, discount, description, merchant }
   */
  async getOffers() {
    return [];
  }
}
