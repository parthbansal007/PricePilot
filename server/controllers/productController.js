import mongoose from 'mongoose';
import PriceHistory from '../models/PriceHistory.js';
import * as productService from '../services/productService.js';

// @desc    Search products
// @route   GET /api/products/search?q=query
// @access  Private
export const searchProducts = async (req, res) => {
  try {
    const { q, category } = req.query;
    const results = await productService.searchProducts(q || '', { category });
    res.json(results || []);
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
    if (!details) {
      return res.status(404).json({ message: 'Product not found.' });
    }
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
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId 
      ? { $or: [{ productId: id }, { canonicalProductId: id }] }
      : { canonicalProductId: id };
    const history = await PriceHistory.find(query).sort({ timestamp: 1 }).lean();
    
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

// @desc    Get aspect-based review intelligence & authenticity score
// @route   GET /api/products/:id/review-intelligence
// @access  Private
export const getReviewIntelligence = async (req, res) => {
  try {
    const { id } = req.params;
    const { analyzeReviewIntelligence } = await import('../services/reviewIntelligenceService.js');
    const intelligence = await analyzeReviewIntelligence(id);
    res.json(intelligence);
  } catch (error) {
    console.error('Review intelligence error:', error);
    res.status(500).json({ message: 'Error analyzing reviews' });
  }
};

// @desc    Consented price submission from browser extension with outlier and abuse protection
// @route   POST /api/products/submit-price
// @access  Public (Optional auth)
export const submitExtensionPrice = async (req, res) => {
  try {
    const { url, retailer, price, title, consented } = req.body;

    if (!consented) {
      return res.status(400).json({ message: 'User consent required for price telemetry.' });
    }

    const numPrice = Number(price);
    if (!numPrice || numPrice <= 0 || numPrice > 10000000) {
      return res.status(400).json({ message: 'Invalid submitted price value.' });
    }

    if (!url || !title) {
      return res.status(400).json({ message: 'url and title are required.' });
    }

    // Outlier check: Find existing price points
    const PriceHistory = (await import('../models/PriceHistory.js')).default;
    const isObjectId = mongoose.Types.ObjectId.isValid(url);
    const query = isObjectId 
      ? [{ productId: url }, { retailer: retailer || 'Amazon.in' }]
      : [{ retailer: retailer || 'Amazon.in' }];
    const recent = await PriceHistory.find({
      $or: query
    }).sort({ timestamp: -1 }).limit(10).lean();

    if (recent.length >= 3) {
      const prices = recent.map(r => r.price).sort((a, b) => a - b);
      const median = prices[Math.floor(prices.length / 2)];
      if (median > 0) {
        if (numPrice < median * 0.2 || numPrice > median * 3.0) {
          return res.status(422).json({
            message: 'Price submission rejected: Outlier detected outside realistic deviation thresholds.'
          });
        }
      }
    }

    // Record verified submission
    const historyData = {
      retailer: retailer || 'Online Store',
      price: numPrice,
      currency: 'INR',
      source: 'extension',
      sourceType: 'extension',
      timestamp: new Date()
    };
    if (isObjectId) {
      historyData.productId = url;
    }
    await PriceHistory.create(historyData);

    res.status(201).json({
      message: 'Extension price point recorded successfully with source extension.',
      recordedPrice: numPrice
    });
  } catch (error) {
    console.error('Submit price error:', error);
    res.status(500).json({ message: 'Error submitting price point' });
  }
};


