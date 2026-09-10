import axios from 'axios';
import ProductProvider from './ProductProvider.js';
import { extractProductInfo, calculateMatchScore } from '../utils/productMatcher.js';
import { extractRetailerUrl, isDirectRetailerUrl } from '../utils/urlUtils.js';

// Helper function to extract price from strings like "$500.00" or "₹4,750"
const extractPrice = (priceStr) => {
  if (!priceStr) return null;
  const num = parseFloat(String(priceStr).replace(/[^0-9.]/g, ''));
  return isNaN(num) ? null : num;
};

const TRUSTED_RETAILERS = [
  'amazon', 'flipkart', 'croma', 'reliance digital', 'vijay sales', 
  'myntra', 'tata cliq', 'samsung', 'apple', 'nykaa', 'ajio', 'jiomart'
];

const ACCESSORY_KEYWORDS = [
  'cover', 'case', 'protector', 'charger', 'cable', 'screen guard', 
  'skin', 'stand', 'mount', 'strap', 'band', 'tempered glass', 'adapter'
];

const isTrustedRetailer = (retailerName) => {
  if (!retailerName) return false;
  const lowerName = retailerName.toLowerCase();
  return TRUSTED_RETAILERS.some(trusted => lowerName.includes(trusted));
};

const isAccessory = (title) => {
  if (!title) return false;
  const lowerTitle = title.toLowerCase();
  return ACCESSORY_KEYWORDS.some(kw => lowerTitle.includes(kw));
};

const queryWantsAccessory = (query) => {
  if (!query) return false;
  const lowerQuery = query.toLowerCase();
  return ACCESSORY_KEYWORDS.some(kw => lowerQuery.includes(kw));
};

export default class SerpApiProductProvider extends ProductProvider {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
    this.baseUrl = 'https://serpapi.com/search.json';
    
    if (!this.apiKey && process.env.NODE_ENV !== 'test') {
       console.warn('SerpApiProductProvider initialized without an API key.');
    }
  }

  async search(query) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          engine: 'google_shopping',
          q: query,
          api_key: this.apiKey,
          hl: 'en',
          gl: 'in', // Or configurable
          num: 100
        }
      });

      const results = response.data.shopping_results || [];
      const wantsAccessory = queryWantsAccessory(query);

      // Normalize results
      const validResults = [];
      for (const item of results) {
        if (!item.title || !isTrustedRetailer(item.source || item.merchant)) continue;
        if (!wantsAccessory && isAccessory(item.title)) continue;

        const matchScore = calculateMatchScore(query, item.title);
        if (matchScore < 40) continue; // Reject low score items

        let pageToken = '';
        if (item.serpapi_immersive_product_api) {
           try {
             const urlObj = new URL(item.serpapi_immersive_product_api);
             pageToken = urlObj.searchParams.get('page_token');
           } catch(e) {}
        }
        
        const price = item.extracted_price || extractPrice(item.price);
        // Use page_token as ID if available, otherwise fallback to base64 title
        const safeId = pageToken ? `pt_${pageToken}` : Buffer.from(item.title).toString('base64');
        const info = extractProductInfo(item.title);
        
        const rawUrl = item.link || item.product_link || '';
        const productUrl = extractRetailerUrl(rawUrl);
        const isDirect = isDirectRetailerUrl(productUrl);

        validResults.push({
          id: safeId,
          providerProductId: safeId,
          title: item.title,
          brand: info.brand,
          model: info.model,
          modelNumber: info.modelNumber,
          productFamily: info.productFamily,
          specifications: info.specifications,
          image: item.thumbnail,
          price: price ? Math.round(price) : null,
          currency: 'INR',
          retailer: item.source || item.merchant || 'Unknown Retailer',
          rating: item.rating || null,
          availability: item.delivery ? 'In Stock' : 'Check Retailer',
          productUrl: productUrl,
          sourceUrl: rawUrl,
          isDirectRetailerUrl: isDirect,
          matchScore
        });
      }

      validResults.sort((a, b) => b.matchScore - a.matchScore);
      return validResults;
    } catch (error) {
      console.error('SerpApi search error:', error.message);
      throw new Error('Product search service is temporarily unavailable.');
    }
  }

  async getProductDetails(id) {
    try {
      let params = {};
      let isImmersive = false;
      let decodedTitle = '';
      
      if (id.startsWith('pt_')) {
        isImmersive = true;
        params = {
          engine: 'google_immersive_product',
          page_token: id.replace('pt_', ''),
          api_key: this.apiKey,
          hl: 'en',
          gl: 'in',
        };
      } else {
        decodedTitle = Buffer.from(id, 'base64').toString('utf-8');
        params = {
          engine: 'google_shopping',
          q: decodedTitle,
          api_key: this.apiKey,
          hl: 'en',
          gl: 'in',
        };
      }

      const response = await axios.get(this.baseUrl, { params });

      if (isImmersive) {
        const product = response.data.product_results;
        if (!product) throw new Error('Product not found');
        
        const info = extractProductInfo(product.title || '');
        
        const offers = (product.stores || []).map(seller => {
          const rawUrl = seller.link || '';
          const productUrl = extractRetailerUrl(rawUrl);
          return {
            store: seller.name || 'Unknown Retailer',
            url: productUrl,
            sourceUrl: rawUrl,
            isDirectRetailerUrl: isDirectRetailerUrl(productUrl),
            price: Math.round(seller.extracted_price || extractPrice(seller.price)),
            availability: seller.details_and_offers ? seller.details_and_offers[0] : 'Check Retailer'
          };
        }).filter(o => o.price > 0);
          
        const lowestPriceOffer = offers.reduce((min, curr) => (curr.price < min.price ? curr : min), offers[0] || { price: 0 });
        
        let image = '';
        if (product.thumbnails && product.thumbnails.length > 0) {
          image = Array.isArray(product.thumbnails[0]) ? product.thumbnails[0][0] : product.thumbnails[0];
        }

        return {
           id: id,
           providerProductId: id,
           title: product.title || decodedTitle || 'Unknown Product',
           brand: product.brand || info.brand,
           model: info.model,
           modelNumber: info.modelNumber,
           productFamily: info.productFamily,
           specifications: info.specifications,
           image: image,
           price: lowestPriceOffer.price || Math.round(extractPrice(product.price_range?.current_price) || 0),
           currency: 'INR',
           retailer: lowestPriceOffer.store || 'Various Retailers',
           rating: product.rating,
           availability: lowestPriceOffer.availability || 'Check Retailers',
           productUrl: lowestPriceOffer.url,
           sourceUrl: lowestPriceOffer.sourceUrl,
           isDirectRetailerUrl: lowestPriceOffer.isDirectRetailerUrl,
           description: Array.isArray(product.about_the_product) ? product.about_the_product.join(' ') : 'Details sourced from Google Shopping',
           offers: offers
        };
      }

      // Fallback for non-immersive (base64 title)
      const results = response.data.shopping_results || [];
      if (results.length === 0) {
        throw new Error('Product not found');
      }

      const info = extractProductInfo(decodedTitle);

      const offers = results
        .filter(seller => seller.title && isTrustedRetailer(seller.source || seller.merchant))
        .filter(seller => calculateMatchScore(decodedTitle, seller.title) >= 60)
        .map(seller => {
          const rawUrl = seller.link || seller.product_link || '';
          const productUrl = extractRetailerUrl(rawUrl);
          
          return {
            store: seller.source || seller.merchant || 'Unknown Retailer',
            url: productUrl,
            sourceUrl: rawUrl,
            isDirectRetailerUrl: isDirectRetailerUrl(productUrl),
            price: Math.round(seller.extracted_price || extractPrice(seller.price)),
            availability: seller.delivery ? 'In Stock' : 'Check Retailer'
          };
        });

      if (offers.length === 0 && results.length > 0) {
         const seller = results[0];
         const rawUrl = seller.link || seller.product_link || '';
         const productUrl = extractRetailerUrl(rawUrl);
         
         offers.push({
           store: seller.source || seller.merchant || 'Unknown Retailer',
           url: productUrl,
           sourceUrl: rawUrl,
           isDirectRetailerUrl: isDirectRetailerUrl(productUrl),
           price: Math.round(seller.extracted_price || extractPrice(seller.price)),
           availability: seller.delivery ? 'In Stock' : 'Check Retailer'
         });
      }

      const firstProduct = results[0];
      const lowestPriceOffer = offers.reduce((min, curr) => (curr.price < min.price ? curr : min), offers[0] || { price: 0 });

      return {
        id: id,
        providerProductId: id,
        title: decodedTitle,
        brand: info.brand,
        model: info.model,
        modelNumber: info.modelNumber,
        productFamily: info.productFamily,
        specifications: info.specifications,
        image: firstProduct.thumbnail || '',
        price: lowestPriceOffer.price || Math.round(firstProduct.extracted_price || extractPrice(firstProduct.price)),
        currency: 'INR',
        retailer: lowestPriceOffer.store || firstProduct.source || 'Unknown',
        rating: firstProduct.rating || null,
        availability: lowestPriceOffer.availability || 'Check Retailer',
        productUrl: lowestPriceOffer.url,
        sourceUrl: lowestPriceOffer.sourceUrl,
        isDirectRetailerUrl: lowestPriceOffer.isDirectRetailerUrl,
        description: 'Details sourced from Google Shopping',
        offers: offers
      };
    } catch (error) {
      console.error('SerpApi getProductDetails error:', error.message);
      if (error.response && error.response.status === 400) {
        throw new Error('Invalid product ID');
      }
      throw new Error('Product details service is temporarily unavailable.');
    }
  }

  async comparePrices(query) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          engine: 'google_shopping',
          q: query,
          api_key: this.apiKey,
          hl: 'en',
          gl: 'in',
          num: 5 // Get top 5 for comparison
        }
      });

      const results = response.data.shopping_results || [];
      const wantsAccessory = queryWantsAccessory(query);
      
      let bestPrice = Infinity;
      const compareResults = results
        .filter(item => item.title && isTrustedRetailer(item.source || item.merchant))
        .filter(item => wantsAccessory || !isAccessory(item.title))
        .filter(item => calculateMatchScore(query, item.title) >= 50)
        .map(item => {
          const price = item.extracted_price || extractPrice(item.price);
          if (price && price < bestPrice) bestPrice = price;
          
          const rawUrl = item.link || item.product_link || '';
          const productUrl = extractRetailerUrl(rawUrl);
          
          return {
            retailer: item.source || item.merchant || 'Unknown Retailer',
            price: price ? Math.round(price) : null,
            availability: item.delivery ? 'In Stock' : 'Check Retailer',
            url: productUrl,
            sourceUrl: rawUrl,
            isDirectRetailerUrl: isDirectRetailerUrl(productUrl)
          };
        });

      return {
        bestPrice: bestPrice === Infinity ? null : Math.round(bestPrice),
        currency: 'INR',
        results: compareResults
      };
    } catch (error) {
      console.error('SerpApi comparePrices error:', error.message);
      throw new Error('Product compare service is temporarily unavailable.');
    }
  }
}
