import Wishlist from '../models/Wishlist.js';
import { getProductDetails } from '../services/productService.js';

// @desc    Add product to wishlist
// @route   POST /api/wishlist
// @access  Private
export const addToWishlist = async (req, res) => {
  try {
    const { productId, productName, image, currentPrice, currency, retailer } = req.body;
    const userId = req.user.uid;

    if (!productId || !productName) {
      return res.status(400).json({ message: 'Product ID and Name are required' });
    }

    // Fetch product details to ensure product exists in DB and get its ObjectId
    const details = await getProductDetails(productId);
    if (!details || !details._id) {
       return res.status(404).json({ message: 'Could not resolve product identity.' });
    }
    const internalProductId = details._id;

    const existingItem = await Wishlist.findOne({ userId, productId: internalProductId });
    if (existingItem) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }

    const wishlistItem = await Wishlist.create({
      userId,
      productId: internalProductId,
      productName,
      image,
      currentPrice,
      currency,
      retailer
    });

    res.status(201).json({ message: 'Added to wishlist', wishlistItem });
  } catch (error) {
    console.error('Wishlist add error:', error);
    res.status(500).json({ message: 'Server error while adding to wishlist.' });
  }
};

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
export const getWishlist = async (req, res) => {
  try {
    const userId = req.user.uid;
    const wishlist = await Wishlist.find({ userId }).sort({ createdAt: -1 });
    res.json(wishlist);
  } catch (error) {
    console.error('Wishlist fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching wishlist.' });
  }
};

// @desc    Remove from wishlist
// @route   DELETE /api/wishlist/:id
// @access  Private
export const removeFromWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    // Use findOneAndDelete with userId to ensure user owns the item
    const wishlistItem = await Wishlist.findOneAndDelete({ _id: id, userId });

    if (!wishlistItem) {
      return res.status(404).json({ message: 'Wishlist item not found' });
    }

    res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Wishlist remove error:', error);
    res.status(500).json({ message: 'Server error while removing from wishlist.' });
  }
};
