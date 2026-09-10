import express from 'express';
import { searchProducts, getProductDetails, compareProducts, getProductHistory } from '../controllers/productController.js';
import { getBetterConfigurations } from '../controllers/configurationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/search', protect, searchProducts);
router.get('/compare', protect, compareProducts);
router.get('/:id', protect, getProductDetails);
router.get('/:id/history', protect, getProductHistory);
router.get('/:id/better-configurations', protect, getBetterConfigurations);

export default router;
