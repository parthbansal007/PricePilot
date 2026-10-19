import DiscoveryProvider from '../DiscoveryProvider.js';

export default class MockDiscoveryProvider extends DiscoveryProvider {
  constructor() {
    super('mock');
  }

  isAvailable() {
    return true;
  }

  async search(query, options = {}) {
    const cleanQuery = query.toLowerCase();
    const basePrice = cleanQuery.includes('laptop') || cleanQuery.includes('macbook')
      ? 89900
      : (cleanQuery.includes('phone') || cleanQuery.includes('iphone') ? 69900 : 19900);

    return [
      {
        id: `mock_amz_${Buffer.from(query).toString('base64').slice(0, 8)}`,
        provider: 'mock',
        title: `${query} (Official Amazon India)`,
        brand: 'Apple',
        model: 'Standard',
        modelNumber: 'IN-2026',
        price: basePrice,
        currency: 'INR',
        retailer: 'Amazon',
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300',
        rating: 4.6,
        reviewCount: 1250,
        productUrl: 'https://www.amazon.in/dp/B0EXAMPLE',
        sourceUrl: 'https://www.amazon.in/dp/B0EXAMPLE',
        isDirectRetailerUrl: true,
        matchScore: 95
      },
      {
        id: `mock_fk_${Buffer.from(query).toString('base64').slice(0, 8)}`,
        provider: 'mock',
        title: `${query} (Flipkart Special)`,
        brand: 'Apple',
        model: 'Standard',
        modelNumber: 'IN-2026',
        price: Math.round(basePrice * 0.98),
        currency: 'INR',
        retailer: 'Flipkart',
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300',
        rating: 4.5,
        reviewCount: 980,
        productUrl: 'https://www.flipkart.com/item/itm12345',
        sourceUrl: 'https://www.flipkart.com/item/itm12345',
        isDirectRetailerUrl: true,
        matchScore: 92
      },
      {
        id: `mock_croma_${Buffer.from(query).toString('base64').slice(0, 8)}`,
        provider: 'mock',
        title: `${query} (Croma Retail)`,
        brand: 'Apple',
        model: 'Standard',
        modelNumber: 'IN-2026',
        price: Math.round(basePrice * 1.02),
        currency: 'INR',
        retailer: 'Croma',
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300',
        rating: 4.4,
        reviewCount: 310,
        productUrl: 'https://www.croma.com/p/23456',
        sourceUrl: 'https://www.croma.com/p/23456',
        isDirectRetailerUrl: true,
        matchScore: 88
      }
    ];
  }
}
