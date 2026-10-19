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
    const queryStr = req.query.query || req.query.q;
    if (!queryStr) {
      return res.status(400).json({ message: 'Search query is required for comparison' });
    }

    const results = await productService.comparePrices(queryStr);
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
    
    // Attempt to get history from DB matching either productId or canonicalProductId
    const history = await PriceHistory.find({
      $or: [{ productId: id }, { canonicalProductId: id }]
    }).sort({ timestamp: 1 }).lean();
    
    if (history.length === 0) {
      return res.json({
        message: 'Not enough price history available yet.',
        history: [],
        dataSources: { totalPoints: 0, backfilledPoints: 0, selfCollectedPoints: 0, historySpanDays: 0 }
      });
    }

    const backfilledPoints = history.filter(h => h.sourceType === 'backfill' || h.source === 'keepa').length;
    const selfCollectedPoints = history.length - backfilledPoints;
    const earliest = new Date(history[0].timestamp);
    const latest = new Date(history[history.length - 1].timestamp);
    const historySpanDays = Math.max(1, Math.round((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)));

    const normalizedHistory = history.map(h => ({
      _id: h._id,
      price: h.price,
      currency: h.currency || 'INR',
      retailer: h.retailer || 'Unknown',
      timestamp: h.timestamp,
      source: h.source || 'provider',
      sourceType: (h.sourceType === 'backfill' || h.source === 'keepa') ? 'backfill' : 'tracked'
    }));

    res.json({
      history: normalizedHistory,
      dataSources: {
        totalPoints: history.length,
        backfilledPoints,
        selfCollectedPoints,
        historySpanDays
      }
    });
  } catch (error) {
    console.error('Price history error:', error);
    res.status(500).json({ message: 'Server error while fetching price history.' });
  }
};
