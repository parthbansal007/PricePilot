import IdentityProvider from '../IdentityProvider.js';

export default class MockIdentityProvider extends IdentityProvider {
  constructor() {
    super('mock-identity');
  }

  isAvailable() {
    return true;
  }

  async lookupProduct(query, options = {}) {
    return {
      icecatId: 'mock-1001',
      title: 'Mock Product Specs',
      brand: query.brand || 'Apple',
      model: 'Mock Model',
      gtin: query.gtin || '0194253000000',
      mpn: query.mpn || 'MOCK-MPN-1',
      description: 'Mock hardware specifications and detailed documentation.',
      images: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300'],
      primaryImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300',
      specs: {
        ram: '16GB',
        storage: '512GB SSD',
        display: '15.3 inch Retina'
      },
      attribution: 'Mock Open Icecat Attribution'
    };
  }
}
