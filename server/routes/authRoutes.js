import express from 'express';
import { syncUser, deleteAccount } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(authRateLimiter);
router.post('/sync', protect, syncUser);
router.delete('/account', protect, deleteAccount);

export default router;
