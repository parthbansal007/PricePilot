import api from './api';

// Mock Data
export const mockProducts = [
  {
    id: 'p1',
    name: 'Sony WH-1000XM5 Wireless Headphones',
    brand: 'Sony',
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=400',
    currentPrice: 29990,
    originalPrice: 34990,
    discount: 14,
    rating: 4.8,
    reviews: 1245,
    stores: 4,
    lowestStore: 'Amazon'
  },
  {
    id: 'p2',
    name: 'Samsung Galaxy S25 Ultra 512GB',
    brand: 'Samsung',
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&q=80&w=400',
    currentPrice: 129999,
    originalPrice: 134999,
    discount: 4,
    rating: 4.9,
    reviews: 843,
    stores: 3,
    lowestStore: 'Flipkart'
  },
  {
    id: 'p3',
    name: 'MacBook Air M3 16GB/512GB',
    brand: 'Apple',
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=400',
    currentPrice: 114990,
    originalPrice: 124900,
    discount: 8,
    rating: 4.9,
    reviews: 2104,
    stores: 5,
    lowestStore: 'Croma'
  },
  {
    id: 'p4',
    name: 'Nike Air Max 270',
    brand: 'Nike',
    category: 'Clothing',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400',
    currentPrice: 8495,
    originalPrice: 11995,
    discount: 29,
    rating: 4.5,
    reviews: 512,
    stores: 2,
    lowestStore: 'Myntra'
  },
  {
    id: 'p5',
    name: 'LG 27 inch 4K UHD Monitor',
    brand: 'LG',
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=400',
    currentPrice: 24999,
    originalPrice: 32000,
    discount: 22,
    rating: 4.6,
    reviews: 328,
    stores: 3,
    lowestStore: 'Amazon'
  }
];

class MockProductProvider {
  async searchProducts(query, filters = {}) {
    return new Promise((resolve) => {
      setTimeout(() => {
        let results = [...mockProducts];
        
        if (query) {
          const q = query.toLowerCase();
          results = results.filter(p => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
        }

        if (filters.category) {
          results = results.filter(p => p.category === filters.category);
        }

        resolve(results);
      }, 800); // simulate network delay
    });
  }

  async getProductDetails(id) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const product = mockProducts.find(p => p.id === id);
        if (product) {
          // Add some mock detailed data
          resolve({
            ...product,
            description: `This is a detailed description for ${product.name}. It is a high-quality product from ${product.brand}.`,
            offers: [
              { store: 'Amazon', price: product.currentPrice, url: '#', availability: 'In Stock' },
              { store: 'Flipkart', price: product.currentPrice + 500, url: '#', availability: 'In Stock' },
              { store: 'Croma', price: product.currentPrice + 1200, url: '#', availability: 'Limited Stock' }
            ]
          });
        } else {
          reject(new Error('Product not found'));
        }
      }, 500);
    });
  }
}

class ExternalProductProvider {
  async searchProducts(query, filters = {}) {
    const response = await api.get('/products/search', { params: { q: query, ...filters } });
    return response.data;
  }

  async getProductDetails(id) {
    const response = await api.get(`/products/${id}`);
    const data = response.data;
    
    // Use offers from backend if available, otherwise fallback to empty
    let offers = data.offers || [];

    return {
      ...data,
      brand: data.retailer, // using retailer as brand if missing
      name: data.title,
      currentPrice: data.price,
      originalPrice: data.price ? data.price * 1.1 : 0, // mock original for now
      discount: 10,
      reviews: 100,
      description: data.description,
      offers: offers.map(o => ({ store: o.store || o.retailer, price: o.price, availability: o.availability, url: o.url, isDirectRetailerUrl: o.isDirectRetailerUrl }))
    };
  }
  async getProductHistory(id: string) {
    try {
      const response = await api.get(`/products/${id}/history`);
      return response.data.history || [];
    } catch (e) {
      console.error("Failed to fetch history", e);
      return [];
    }
  }

  async compareProducts(query: string) {
    try {
      const response = await api.get('/products/compare', { params: { q: query } });
      return response.data;
    } catch (e) {
      console.error("Failed to compare products", e);
      throw e;
    }
  }
}

// Select provider based on env
const providerType = import.meta.env.VITE_PRODUCT_PROVIDER || 'external';
export const productService = providerType === 'external' 
  ? new ExternalProductProvider() 
  : new MockProductProvider();
