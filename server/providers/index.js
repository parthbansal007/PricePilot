import SerpApiProductProvider from './SerpApiProductProvider.js';

// Factory or configured instance
let productProviderInstance = null;

export const getProductProvider = () => {
  if (productProviderInstance) {
    return productProviderInstance;
  }

  // We can add logic here to switch providers based on env vars
  // e.g. if (process.env.PROVIDER === 'amazon') return new AmazonProvider()

  productProviderInstance = new SerpApiProductProvider(process.env.PRODUCT_SEARCH_API_KEY);
  
  return productProviderInstance;
};
