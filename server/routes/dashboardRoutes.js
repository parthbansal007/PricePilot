import express from 'express';
import { getDashboardMetrics } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getDashboardMetrics);

export default router;
