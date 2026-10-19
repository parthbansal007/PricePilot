/**
 * Base ReviewProvider Interface
 * Normalizes multi-retailer reviews to:
 * { source, rating, count, snippets[] }
 */
export default class ReviewProvider {
  constructor(name) {
    this.name = name;
  }

  isAvailable() {
    return false;
  }

  /**
   * Fetch customer reviews and rating snippets
   * @param {string} identifier - ASIN or Google Product ID
   * @param {Object} options
   * @returns {Promise<Object>} { source, rating, count, snippets: [] }
   */
  async getReviews(_identifier, _options = {}) {
    throw new Error(`getReviews() not implemented on ${this.name}`);
  }
}
