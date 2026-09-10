import express from 'express';
import { addTracking, getTrackedProducts, removeTracking, runCronJob } from '../controllers/trackingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/cron-run', runCronJob); // External cron triggers this
router.post('/', protect, addTracking);
router.get('/', protect, getTrackedProducts);
router.delete('/:id', protect, removeTracking);

export default router;
