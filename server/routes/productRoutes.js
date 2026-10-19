import express from 'express';
import { z } from 'zod';
import {
  searchProducts,
  getProductDetails,
  compareProducts,
  getProductHistory,
  getReviewIntelligence,
  submitExtensionPrice
} from '../controllers/productController.js';
import { getBetterConfigurations } from '../controllers/configurationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { strictSearchAdvisorLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

const searchQuerySchema = {
  query: z.object({
    q: z.string().min(1, 'Search query is required').max(200)
  })
};

const compareQuerySchema = {
  query: z.object({
    query: z.string().min(1).max(200).optional(),
    q: z.string().min(1).max(200).optional()
  }).refine(data => data.query || data.q, {
    message: 'Either query or q parameter is required for comparison'
  })
};

const idParamSchema = {
  params: z.object({
    id: z.string().min(1, 'Product ID is required').max(200)
  })
};

router.get('/search', protect, strictSearchAdvisorLimiter, validateRequest(searchQuerySchema), searchProducts);
router.get('/compare', protect, strictSearchAdvisorLimiter, validateRequest(compareQuerySchema), compareProducts);
router.get('/:id', protect, validateRequest(idParamSchema), getProductDetails);
router.get('/:id/history', protect, validateRequest(idParamSchema), getProductHistory);
router.get('/:id/better-configurations', protect, validateRequest(idParamSchema), getBetterConfigurations);
router.get('/:id/review-intelligence', protect, validateRequest(idParamSchema), getReviewIntelligence);
router.post('/submit-price', submitExtensionPrice);

export default router;
