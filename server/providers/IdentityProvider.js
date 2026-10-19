/**
 * Base IdentityProvider Interface
 * Enriches CanonicalProduct entities with GTIN/EAN, normalized specs, and media
 */
export default class IdentityProvider {
  constructor(name) {
    this.name = name;
  }

  isAvailable() {
    return false;
  }

  /**
   * Lookup product specifications and catalog identity
   * @param {Object} query - { gtin, mpn, brand }
   * @param {Object} options
   * @returns {Promise<Object|null>} Normalized product specs & identity
   */
  async lookupProduct(_query, _options = {}) {
    throw new Error(`lookupProduct() not implemented on ${this.name}`);
  }
}
