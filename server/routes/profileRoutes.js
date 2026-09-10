import express from 'express';
import multer from 'multer';
import { getProfile, updateProfile, uploadProfilePicture } from '../controllers/profileController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', protect, getProfile);
router.put('/', protect, updateProfile);
router.post('/picture', protect, upload.single('profilePicture'), uploadProfilePicture);

export default router;
