/**
 * Base RetailerProvider Interface
 * Direct retailer data feeds (Flipkart, Amazon)
 * Provides high-trust offer data that outranks SERP discovery
 */
export default class RetailerProvider {
  constructor(name) {
    this.name = name;
  }

  isAvailable() {
    return false;
  }

  /**
   * Fetch live offer details directly from the retailer API
   * @param {string} identifier - ASIN, FSN, or Product URL
   * @param {Object} options
   * @returns {Promise<Object|null>} Normalized offer object
   */
  async getOffer(_identifier, _options = {}) {
    throw new Error(`getOffer() not implemented on ${this.name}`);
  }
}
