import express from 'express';
import { z } from 'zod';
import { addToWishlist, getWishlist, removeFromWishlist } from '../controllers/wishlistController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

const addWishlistSchema = {
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
    title: z.string().optional(),
    price: z.number().optional(),
    image: z.string().optional()
  })
};

const idParamSchema = {
  params: z.object({
    id: z.string().min(1, 'Wishlist item ID is required')
  })
};

router.post('/', protect, validateRequest(addWishlistSchema), addToWishlist);
router.get('/', protect, getWishlist);
router.delete('/:id', protect, validateRequest(idParamSchema), removeFromWishlist);

export default router;
