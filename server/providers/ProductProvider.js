/**
 * Base class for product providers.
 * All product providers should implement this interface to be interchangeable.
 */
export default class ProductProvider {
  /**
   * Search for products based on a query.
   * @param {string} query - The search query.
   * @returns {Promise<Array>} Array of normalized product objects.
   */
  async search(query) {
    throw new Error('Method not implemented: search');
  }

  /**
   * Get detailed information about a specific product.
   * @param {string} id - The provider-specific product ID.
   * @returns {Promise<Object>} Normalized product details.
   */
  async getProductDetails(id) {
    throw new Error('Method not implemented: getProductDetails');
  }

  /**
   * Compare prices for a product across different retailers.
   * @param {string} query - The product name or query.
   * @returns {Promise<Object>} Comparison object with best price and list of retailers.
   */
  async comparePrices(query) {
    throw new Error('Method not implemented: comparePrices');
  }
}
