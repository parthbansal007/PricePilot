import express from 'express';
import { syncUser, deleteAccount } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/sync', protect, syncUser);
router.delete('/account', protect, deleteAccount);

export default router;
