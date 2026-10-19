import express from 'express';
import { getPersonalBuyDecision } from '../controllers/decisionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { strictSearchAdvisorLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { z } from 'zod';

const router = express.Router();

const decisionSchema = {
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
    pincode: z.string().optional()
  })
};

router.use(strictSearchAdvisorLimiter);
router.use(protect);

router.post('/', validateRequest(decisionSchema), getPersonalBuyDecision);

export default router;
