import RetailerProvider from '../RetailerProvider.js';

export default class FlipkartRetailerAdapter extends RetailerProvider {
  constructor() {
    super('flipkart');
    this.affiliateId = process.env.FLIPKART_AFFILIATE_ID;
    this.affiliateToken = process.env.FLIPKART_AFFILIATE_TOKEN;
    this.baseUrl = 'https://affiliate-api.flipkart.net/affiliate/1.0/product.json';
  }

  isAvailable() {
    return Boolean(this.affiliateId && this.affiliateToken);
  }

  async getOffer(productId, options = {}) {
    if (!this.isAvailable()) {
      return null;
    }

    const { timeoutMs = 8000 } = options;
    const url = `${this.baseUrl}?id=${encodeURIComponent(productId)}`;

    const response = await fetch(url, {
      headers: {
        'Fk-Affiliate-Id': this.affiliateId,
        'Fk-Affiliate-Token': this.affiliateToken,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`Flipkart API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const baseInfo = data.productBaseInfoV1;
    if (!baseInfo) return null;

    const sellingPrice = baseInfo.flipkartSellingPrice?.amount || baseInfo.flipkartSpecialPrice?.amount;
    const mrp = baseInfo.maximumRetailPrice?.amount;
    const productUrl = baseInfo.productUrls?.flipkart;

    return {
      retailer: 'Flipkart',
      price: sellingPrice ? Math.round(sellingPrice) : null,
      mrp: mrp ? Math.round(mrp) : null,
      currency: baseInfo.flipkartSellingPrice?.currency || 'INR',
      url: productUrl || `https://www.flipkart.com/item/${productId}`,
      isDirectRetailerUrl: true,
      availability: baseInfo.inStock ? 'In Stock' : 'Out of Stock',
      source: 'retailer-api',
      trustLevel: 'high'
    };
  }
}
