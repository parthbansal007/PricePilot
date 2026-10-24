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
import { protect, optionalProtect } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { strictSearchAdvisorLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

const searchQuerySchema = {
  query: z.object({
    q: z.string().max(200).optional(),
    category: z.string().max(100).optional()
  }).refine(data => {
    const hasQ = Boolean(data.q && data.q.trim().length > 0);
    const hasCat = Boolean(data.category && data.category.trim().length > 0);
    return hasQ || hasCat;
  }, {
    message: 'Search query (q) or category is required.'
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

router.get('/search', optionalProtect, strictSearchAdvisorLimiter, validateRequest(searchQuerySchema), searchProducts);
router.get('/compare', optionalProtect, strictSearchAdvisorLimiter, validateRequest(compareQuerySchema), compareProducts);
router.get('/:id', optionalProtect, validateRequest(idParamSchema), getProductDetails);
router.get('/:id/history', optionalProtect, validateRequest(idParamSchema), getProductHistory);
router.get('/:id/better-configurations', optionalProtect, validateRequest(idParamSchema), getBetterConfigurations);
router.get('/:id/review-intelligence', optionalProtect, validateRequest(idParamSchema), getReviewIntelligence);
router.post('/submit-price', submitExtensionPrice);

export default router;
