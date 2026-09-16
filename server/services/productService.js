import { getProductProvider } from '../providers/index.js';
import Product from '../models/Product.js';
import PriceHistory from '../models/PriceHistory.js';

const mockSearchData = (query) => ([
  {
    id: 'mock-1',
    title: `Mock iPhone 15 Pro - ${query}`,
    image: 'https://via.placeholder.com/200',
    price: 99900,
    currency: 'INR',
    retailer: 'Amazon',
    rating: 4.8,
    availability: 'In Stock',
    productUrl: 'https://example.com/product'
  },
  {
    id: 'mock-2',
    title: `Mock Samsung S24 - ${query}`,
    image: 'https://via.placeholder.com/200',
    price: 89900,
    currency: 'INR',
    retailer: 'Best Buy',
    rating: 4.5,
    availability: 'In Stock',
    productUrl: 'https://example.com/product2'
  }
]);

const mockDetailsData = (id) => ({
  id,
  title: `Mock Product Details for ${id}`,
  image: 'https://via.placeholder.com/400',
  price: 99900,
  currency: 'INR',
  retailer: 'Amazon',
  rating: 4.8,
  availability: 'In Stock',
  productUrl: 'https://example.com/product',
  description: 'Detailed description of the mock product.',
  offers: [
    { store: 'Amazon', url: 'https://example.com/product', price: 999.00, availability: 'In Stock' }
  ]
});

const mockCompareData = () => ({
  bestPrice: 89900,
  currency: 'INR',
  results: [
    { retailer: 'Amazon', price: 99900, availability: 'In Stock', url: '#' },
    { retailer: 'Best Buy', price: 89900, availability: 'In Stock', url: '#' },
    { retailer: 'Walmart', price: 94900, availability: 'Out of Stock', url: '#' },
  ]
});

export const searchProducts = async (query) => {
  const isMock = process.env.USE_MOCK_DATA === 'true' || !process.env.PRODUCT_SEARCH_API_KEY;
  if (isMock) {
    console.log('Using mock data for product search');
    return mockSearchData(query);
  }

  const provider = getProductProvider();
  const rawResults = await provider.search(query);
  
  // Upsert to MongoDB to establish identity
  const results = [];
  for (const item of rawResults) {
    const saved = await saveOrUpdateProduct(item);
    if (saved) {
      results.push({ ...item, id: saved._id.toString(), _id: saved._id.toString() });
    }
  }
  
  return results;
};

export const getProductDetails = async (id) => {
  const isMock = process.env.USE_MOCK_DATA === 'true' || !process.env.PRODUCT_SEARCH_API_KEY;
  if (isMock) {
    return mockDetailsData(id);
  }

  const provider = getProductProvider();
  try {
    // Check if ID is a valid MongoDB ObjectId
    let internalProduct = null;
    let providerId = id;
    
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      internalProduct = await Product.findById(id);
      if (internalProduct) {
        providerId = internalProduct.providerProductId;
      } else {
        // This is a MongoDB ID but the product was deleted from the DB
        throw new Error('Invalid product ID');
      }
    }

    const details = await provider.getProductDetails(providerId);

    // Persist or update product data in MongoDB
    if (details) {
      if (internalProduct) {
         details.providerProductId = internalProduct.providerProductId;
      }
      const savedProduct = await saveOrUpdateProduct(details);
      details.id = savedProduct._id.toString();
      details._id = savedProduct._id.toString();
      
      // Create price history record if price is available and product is saved
      if (details.price && savedProduct) {
        await PriceHistory.create({
          productId: savedProduct._id,
          price: details.price,
          currency: details.currency || 'INR',
          retailer: details.retailer
        });
      }
    }
    return details;
  } catch (error) {
    if (error.message === 'Invalid product ID') {
      // Fallback response similar to what the controller was doing
      return {
        id,
        title: 'Product Details Unavailable',
        image: 'https://via.placeholder.com/400',
        price: 0,
        currency: 'INR',
        retailer: 'Unknown',
        rating: null,
        availability: 'Unknown',
        productUrl: '',
        description: 'The configured provider requires a valid product ID to fetch full details.'
      };
    }
    throw error;
  }
};

export const comparePrices = async (query) => {
  const isMock = process.env.USE_MOCK_DATA === 'true' || !process.env.PRODUCT_SEARCH_API_KEY;
  if (isMock) {
     return mockCompareData();
  }

  const provider = getProductProvider();
  return await provider.comparePrices(query);
};

export const saveOrUpdateProduct = async (productDetails) => {
  try {
    const productData = {
      title: productDetails.title,
      normalizedTitle: productDetails.title.toLowerCase().trim(),
      brand: productDetails.brand,
      productFamily: productDetails.productFamily,
      model: productDetails.model,
      modelNumber: productDetails.modelNumber,
      specifications: productDetails.specifications,
      image: productDetails.image,
      retailer: productDetails.retailer,
      productUrl: productDetails.productUrl,
      sourceUrl: productDetails.sourceUrl,
      isDirectRetailerUrl: productDetails.isDirectRetailerUrl,
      currentPrice: productDetails.price,
      currency: productDetails.currency,
      rating: productDetails.rating,
      availability: productDetails.availability,
      providerProductId: productDetails.providerProductId || productDetails.id
    };

    const savedProduct = await Product.findOneAndUpdate(
      { providerProductId: productData.providerProductId },
      productData,
      { upsert: true, new: true }
    );
    return savedProduct;
  } catch (error) {
    console.error('Error saving product to DB:', error.message);
  }
};
