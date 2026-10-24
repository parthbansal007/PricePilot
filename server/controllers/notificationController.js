import mongoose from 'mongoose';
import Notification from '../models/Notification.js';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.uid;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (error) {
    console.error('Notification fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching notifications.' });
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { read: true },
      { returnDocument: 'after' }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Notification read error:', error);
    res.status(500).json({ message: 'Server error while updating notification.' });
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.uid;
    await Notification.updateMany(
      { userId, read: false },
      { read: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Notification read-all error:', error);
    res.status(500).json({ message: 'Server error while updating notifications.' });
  }
};

// @desc    Get user notification preferences
// @route   GET /api/notifications/preferences
// @access  Private
export const getPreferences = async (req, res) => {
  try {
    const userId = req.user.uid;
    const user = await import('../models/User.js').then(m => m.default.findById(userId));
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.notificationPreferences || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
export const updatePreferences = async (req, res) => {
  try {
    const userId = req.user.uid;
    const User = (await import('../models/User.js')).default;
    const {
      emailAlerts, telegramAlerts, pushAlerts, smsAlerts, whatsappAlerts,
      telegramChatId, phoneNumber, priceDropThreshold, fcmToken
    } = req.body;

    const updateFields = {};
    if (emailAlerts !== undefined) updateFields['notificationPreferences.emailAlerts'] = emailAlerts;
    if (telegramAlerts !== undefined) updateFields['notificationPreferences.telegramAlerts'] = telegramAlerts;
    if (pushAlerts !== undefined) updateFields['notificationPreferences.pushAlerts'] = pushAlerts;
    if (smsAlerts !== undefined) updateFields['notificationPreferences.smsAlerts'] = smsAlerts;
    if (whatsappAlerts !== undefined) updateFields['notificationPreferences.whatsappAlerts'] = whatsappAlerts;
    if (telegramChatId !== undefined) updateFields['notificationPreferences.telegramChatId'] = telegramChatId;
    if (phoneNumber !== undefined) updateFields['notificationPreferences.phoneNumber'] = phoneNumber;
    if (priceDropThreshold !== undefined) updateFields['notificationPreferences.priceDropThreshold'] = priceDropThreshold;

    const updateQuery = { $set: updateFields };
    if (fcmToken) {
      updateQuery.$addToSet = { 'notificationPreferences.fcmTokens': fcmToken };
    }

    const updated = await User.findByIdAndUpdate(userId, updateQuery, { new: true });
    res.json({
      message: 'Preferences updated successfully',
      preferences: updated?.notificationPreferences
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unsubscribe via token from email
// @route   GET /api/notifications/unsubscribe
// @access  Public
export const unsubscribeByToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('Unsubscribe token is required.');

    const User = (await import('../models/User.js')).default;
    const user = await User.findOneAndUpdate(
      { 'notificationPreferences.unsubscribeToken': token },
      {
        $set: {
          'notificationPreferences.unsubscribed': true,
          'notificationPreferences.emailAlerts': false
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).send('Invalid or expired unsubscribe link.');
    }

    res.send(`
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h2 style="color: #4f46e5;">PricePilot AI</h2>
        <p style="font-size: 18px; color: #16a34a;">You have been successfully unsubscribed from price alert emails.</p>
        <p style="color: #64748b;">You can update your multi-channel notification preferences at any time in your Settings.</p>
      </div>
    `);
  } catch (error) {
    res.status(500).send('Error processing unsubscribe request.');
  }
};

// @desc    Send test alert
// @route   POST /api/notifications/test
// @access  Private
export const sendTestAlert = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { dispatchNotification } = await import('../services/notificationService.js');
    const result = await dispatchNotification(userId, {
      type: 'SYSTEM',
      title: 'PricePilot Test Alert',
      message: 'This is a test notification verifying your active alert channels.',
      currentPrice: 49999
    });
    res.json({ message: 'Test alert dispatched', result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

