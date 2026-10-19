/**
 * Base HistoryProvider Interface
 * Backfills real historical pricing for matched items
 */
export default class HistoryProvider {
  constructor(name) {
    this.name = name;
  }

  isAvailable() {
    return false;
  }

  /**
   * Fetch historical price data points for an item
   * @param {string} asin - Amazon ASIN or item identifier
   * @param {Object} options
   * @returns {Promise<Array>} Array of { timestamp, price, currency, retailer, sourceType }
   */
  async getHistory(asin, options = {}) {
    throw new Error(`getHistory() not implemented on ${this.name}`);
  }
}
