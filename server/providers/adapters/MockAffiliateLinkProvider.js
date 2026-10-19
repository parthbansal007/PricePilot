import AffiliateLinkProvider from '../AffiliateLinkProvider.js';

export default class MockAffiliateLinkProvider extends AffiliateLinkProvider {
  constructor() {
    super('mock-affiliate');
  }

  isAvailable() {
    return true;
  }

  async generateDeeplink(rawUrl, options = {}) {
    const parsed = new URL(rawUrl);
    parsed.searchParams.set('aff_mock', 'pricepilot');
    if (options.subId) {
      parsed.searchParams.set('subid', options.subId);
    }
    return parsed.toString();
  }

  async getOffers() {
    return [
      {
        couponCode: 'PILOT10',
        discount: '10% off',
        description: 'Mock 10% instant discount',
        merchant: 'amazon'
      }
    ];
  }
}
