import TrackedProduct from '../models/TrackedProduct.js';
import { getProductDetails } from '../services/productService.js';

// @desc    Add product to tracking
// @route   POST /api/tracking
// @access  Private
export const addTracking = async (req, res) => {
  try {
    const { productId, productName, targetPrice } = req.body;
    
    if (!productId || !productName) {
      return res.status(400).json({ message: 'Product ID and Name are required' });
    }

    const userId = req.user.uid;

    // Fetch product details to seed the database and get the internal MongoDB ObjectId
    const details = await getProductDetails(productId);
    
    if (!details || !details._id) {
       return res.status(404).json({ message: 'Could not resolve product identity.' });
    }

    const internalProductId = details._id;

    const existingTracking = await TrackedProduct.findOne({ userId, productId: internalProductId });
    
    if (existingTracking) {
      existingTracking.targetPrice = targetPrice || existingTracking.targetPrice;
      existingTracking.active = true;
      await existingTracking.save();
      return res.json({ message: 'Tracking updated', trackedProduct: existingTracking });
    }

    const trackedProduct = await TrackedProduct.create({
      userId,
      productId: internalProductId,
      productName,
      targetPrice,
    });

    res.status(201).json({ message: 'Tracking started', trackedProduct });
  } catch (error) {
    console.error('Tracking add error:', error);
    res.status(500).json({ message: 'Server error while adding tracking.' });
  }
};

import PriceHistory from '../models/PriceHistory.js';
import Product from '../models/Product.js';

// @desc    Get all tracked products for user
// @route   GET /api/tracking
// @access  Private
export const getTrackedProducts = async (req, res) => {
  try {
    const userId = req.user.uid;
    const trackedProducts = await TrackedProduct.find({ userId, active: true }).sort({ createdAt: -1 }).populate('productId');
    
    // Fetch price history for each tracked product
    const enhancedProducts = await Promise.all(trackedProducts.map(async (tp) => {
      const history = await PriceHistory.find({ productId: tp.productId._id })
        .sort({ timestamp: -1 })
        .limit(30);
        
      const currentPrice = tp.productId.currentPrice;
      
      return {
        ...tp.toObject(),
        productId: tp.productId._id,
        productData: tp.productId,
        productName: tp.productId.name || tp.productName, // ensure name is there
        currentPrice: currentPrice,
        priceHistory: history.reverse()
      };
    }));

    res.json(enhancedProducts);
  } catch (error) {
    console.error('Tracking fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching tracked products.' });
  }
};

// @desc    Remove/Deactivate tracking
// @route   DELETE /api/tracking/:id
// @access  Private
export const removeTracking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const trackedProduct = await TrackedProduct.findOne({ _id: id, userId });

    if (!trackedProduct) {
      return res.status(404).json({ message: 'Tracking not found' });
    }

    trackedProduct.active = false;
    await trackedProduct.save();

    res.json({ message: 'Tracking stopped' });
  } catch (error) {
    console.error('Tracking remove error:', error);
    res.status(500).json({ message: 'Server error while stopping tracking.' });
  }
};

import { runPriceCheckJob } from '../jobs/priceTrackingJob.js';

// @desc    Trigger background price check job
// @route   POST /api/tracking/cron-run
// @access  Public (protected by secret)
export const runCronJob = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return res.status(500).json({ message: 'CRON_SECRET not configured on server' });
    }

    // Expecting "Bearer <SECRET>" or a query parameter "?secret=<SECRET>"
    const providedSecret = authHeader?.replace('Bearer ', '') || req.query.secret;

    if (providedSecret !== cronSecret) {
      return res.status(401).json({ message: 'Unauthorized: Invalid cron secret' });
    }

    const result = await runPriceCheckJob();
    res.json(result);
  } catch (error) {
    console.error('Cron job manual trigger error:', error);
    res.status(500).json({ message: 'Server error running cron job' });
  }
};
