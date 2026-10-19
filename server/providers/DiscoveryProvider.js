/**
 * Base DiscoveryProvider Interface
 */
export default class DiscoveryProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Search product listings for a given query
   * @param {string} query
   * @param {Object} options - { timeoutMs, gl, hl, limit }
   * @returns {Promise<Array>} Normalized listing objects
   */
  async search(_query, _options = {}) {
    throw new Error(`search() not implemented on ${this.name}`);
  }

  /**
   * Check if provider is enabled and configured with credentials
   */
  isAvailable() {
    return false;
  }
}
