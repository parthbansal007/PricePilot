import PriceHistory from '../models/PriceHistory.js';
import * as productService from '../services/productService.js';

// @desc    Search products
// @route   GET /api/products/search?q=query
// @access  Private
export const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const results = await productService.searchProducts(q);
    res.json(results);
  } catch (error) {
    console.error('Product search error:', error.message);
    res.status(503).json({ message: 'Product search service is temporarily unavailable.' });
  }
};

// @desc    Get product details
// @route   GET /api/products/:id
// @access  Private
export const getProductDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const details = await productService.getProductDetails(id);
    res.json(details);
  } catch (error) {
    console.error('Product details error:', error.message);
    res.status(503).json({ message: 'Product details service is temporarily unavailable.' });
  }
};

// @desc    Compare products (get from multiple retailers)
// @route   GET /api/products/compare?q=query
// @access  Private
export const compareProducts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: 'Search query is required for comparison' });
    }

    const results = await productService.comparePrices(q);
    res.json(results);
  } catch (error) {
    console.error('Product compare error:', error.message);
    res.status(503).json({ message: 'Product compare service is temporarily unavailable.' });
  }
};

// @desc    Get product price history
// @route   GET /api/products/:id/history
// @access  Private
export const getProductHistory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Attempt to get history from DB
    const history = await PriceHistory.find({ productId: id }).sort({ timestamp: 1 });
    
    if (history.length === 0) {
      return res.json({ message: 'Not enough price history available yet.', history: [] });
    }

    res.json({ history });
  } catch (error) {
    console.error('Price history error:', error);
    res.status(500).json({ message: 'Server error while fetching price history.' });
  }
};
