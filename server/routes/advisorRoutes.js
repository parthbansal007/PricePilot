import express from 'express';
import { z } from 'zod';
import { getAIAdvice, chatWithAgent } from '../controllers/advisorController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { strictSearchAdvisorLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

const adviceBodySchema = {
  body: z.object({
    message: z.string().min(1, 'Message is required').max(1000),
    productId: z.string().optional()
  })
};

router.post('/', protect, strictSearchAdvisorLimiter, validateRequest(adviceBodySchema), getAIAdvice);
router.post('/chat', protect, strictSearchAdvisorLimiter, chatWithAgent);

export default router;

