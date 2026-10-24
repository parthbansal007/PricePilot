import express from 'express';
import { z } from 'zod';
import { addToWishlist, getWishlist, removeFromWishlist, updateWishlistItem } from '../controllers/wishlistController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

const addWishlistSchema = {
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
    productName: z.string().optional(),
    title: z.string().optional(),
    price: z.number().optional(),
    currentPrice: z.number().optional(),
    targetPrice: z.number().optional(),
    status: z.enum(['watching', 'price-dropped', 'ready', 'purchased']).optional(),
    image: z.string().optional(),
    currency: z.string().optional(),
    retailer: z.string().optional()
  }).passthrough()
};

const idParamSchema = {
  params: z.object({
    id: z.string().min(1, 'Wishlist item ID is required')
  })
};

const updateWishlistSchema = {
  params: z.object({
    id: z.string().min(1, 'Wishlist item ID is required')
  }),
  body: z.object({
    status: z.enum(['watching', 'price-dropped', 'ready', 'purchased']).optional(),
    targetPrice: z.number().optional()
  }).passthrough()
};

router.post('/', protect, validateRequest(addWishlistSchema), addToWishlist);
router.get('/', protect, getWishlist);
router.patch('/:id', protect, validateRequest(updateWishlistSchema), updateWishlistItem);
router.put('/:id', protect, validateRequest(updateWishlistSchema), updateWishlistItem);
router.delete('/:id', protect, validateRequest(idParamSchema), removeFromWishlist);

export default router;
