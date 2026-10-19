import express from 'express';
import multer from 'multer';
import { getProfile, updateProfile, uploadProfilePicture } from '../controllers/profileController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.');
      err.status = 400;
      cb(err, false);
    }
  }
});

// Middleware to catch multer-specific errors (e.g. file too large)
const handleUpload = (req, res, next) => {
  upload.single('profilePicture')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum image size is 5MB.' });
      }
      return res.status(err.status || 400).json({ message: err.message || 'Error uploading file' });
    }
    next();
  });
};

import { z } from 'zod';
import { validateRequest } from '../middleware/validateRequest.js';

const updateProfileSchema = {
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    notificationPreferences: z.object({
      priceDropThreshold: z.number().nonnegative().optional(),
      emailAlerts: z.boolean().optional(),
      pushAlerts: z.boolean().optional()
    }).optional()
  })
};

router.get('/', protect, getProfile);
router.put('/', protect, validateRequest(updateProfileSchema), updateProfile);
router.post('/picture', protect, handleUpload, uploadProfilePicture);

export default router;
