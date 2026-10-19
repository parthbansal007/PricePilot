import RetailerProvider from '../RetailerProvider.js';

export default class MockRetailerProvider extends RetailerProvider {
  constructor(retailerName = 'Amazon') {
    super(`mock-${retailerName.toLowerCase()}`);
    this.retailerName = retailerName;
  }

  isAvailable() {
    return true;
  }

  async getOffer(identifier, options = {}) {
    return {
      retailer: this.retailerName,
      price: 69990,
      mrp: 79900,
      currency: 'INR',
      url: `https://www.${this.retailerName.toLowerCase()}.in/dp/${identifier}`,
      isDirectRetailerUrl: true,
      availability: 'In Stock',
      source: 'retailer-api',
      trustLevel: 'high'
    };
  }
}
