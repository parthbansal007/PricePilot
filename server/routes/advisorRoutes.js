import express from 'express';
import { getAIAdvice } from '../controllers/advisorController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, getAIAdvice);

export default router;
