import express from 'express';
import { z } from 'zod';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences,
  unsubscribeByToken,
  sendTestAlert
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

const idParamSchema = {
  params: z.object({
    id: z.string().min(1, 'Notification ID is required')
  })
};

router.get('/', protect, getNotifications);
router.get('/preferences', protect, getPreferences);
router.put('/preferences', protect, updatePreferences);
router.get('/unsubscribe', unsubscribeByToken);
router.post('/test', protect, sendTestAlert);
router.patch('/read-all', protect, markAllAsRead);
router.patch('/:id/read', protect, validateRequest(idParamSchema), markAsRead);

export default router;

