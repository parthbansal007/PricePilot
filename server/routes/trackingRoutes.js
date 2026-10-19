import express from 'express';
import { z } from 'zod';
import { addTracking, getTrackedProducts, removeTracking, runCronJob } from '../controllers/trackingController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

const addTrackingSchema = {
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
    targetPrice: z.number().positive().optional(),
    productName: z.string().optional()
  })
};

const idParamSchema = {
  params: z.object({
    id: z.string().min(1, 'Tracking ID is required')
  })
};

// Secured webhook (secret via Authorization header only)
router.post('/cron-run', runCronJob);
router.post('/', protect, validateRequest(addTrackingSchema), addTracking);
router.get('/', protect, getTrackedProducts);
router.delete('/:id', protect, validateRequest(idParamSchema), removeTracking);

export default router;
