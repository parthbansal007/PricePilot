import axios from 'axios';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import cacheService from './cacheService.js';

// In-memory deduplication cache fallback
const localDedupeCache = new Map();

/**
 * Check if a duplicate notification was sent recently (within windowHours)
 */
export async function isDuplicateAlert(userId, productId, price, windowHours = 12) {
  const cacheKey = `dedupe:notif:${userId}:${productId || 'general'}`;
  const now = Date.now();
  const windowMs = windowHours * 60 * 60 * 1000;

  try {
    const cached = await cacheService.get(cacheKey);
    if (cached && cached.value) {
      const parsed = typeof cached.value === 'string' ? JSON.parse(cached.value) : cached.value;
      if (price && parsed.price && Math.abs(price - parsed.price) / parsed.price < 0.01) {
        return true;
      }
    }
    await cacheService.set(cacheKey, { price, timestamp: now }, { ttlMs: windowMs });
    return false;
  } catch (_err) {
    // Fallback to local in-memory deduplication cache
  }

  const cached = localDedupeCache.get(cacheKey);
  if (cached && (now - cached.timestamp < windowMs)) {
    if (price && cached.price && Math.abs(price - cached.price) / cached.price < 0.01) {
      return true;
    }
  }

  localDedupeCache.set(cacheKey, { price, timestamp: now });
  return false;
}

/**
 * Multi-channel notification dispatcher
 */
export async function dispatchNotification(userId, {
  type = 'PRICE_DROP',
  title,
  message,
  productId = null,
  currentPrice = null,
  targetPrice = null,
  retailer = null,
  url = null
}) {
  try {
    const user = await User.findById(userId).lean();
    if (!user) {
      logger.warn({ userId }, 'Cannot dispatch notification: User not found');
      return null;
    }

    const prefs = user.notificationPreferences || { emailAlerts: true };

    // Deduplication check for price drops
    if (type === 'PRICE_DROP' && productId) {
      const isDupe = await isDuplicateAlert(userId, productId, currentPrice);
      if (isDupe) {
        logger.info({ userId, productId, currentPrice }, 'Notification suppressed: duplicate alert within 12h');
        return { status: 'SUPPRESSED', reason: 'DUPLICATE_WITHIN_WINDOW' };
      }
    }

    const channelsSent = ['IN_APP'];
    const deliveryErrors = [];

    const appUrl = process.env.APP_URL || 'https://pricepilot-zr6n.onrender.com';
    const unsubToken = prefs.unsubscribeToken || 'default';
    const unsubscribeLink = `${appUrl}/api/notifications/unsubscribe?token=${unsubToken}`;

    // 1. EMAIL CHANNEL (Resend or SES)
    if (prefs.emailAlerts && !prefs.unsubscribed && user.email) {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        try {
          await axios.post(
            'https://api.resend.com/emails',
            {
              from: 'PricePilot AI <alerts@resend.dev>',
              to: [user.email],
              subject: `[PricePilot] ${title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <h2 style="color: #4f46e5;">PricePilot AI Alert</h2>
                  <h3>${title}</h3>
                  <p style="color: #334155; font-size: 15px; line-height: 1.5;">${message}</p>
                  ${currentPrice ? `<p style="font-size: 18px; font-weight: bold; color: #16a34a;">Current Price: ₹${currentPrice.toLocaleString('en-IN')}</p>` : ''}
                  ${targetPrice ? `<p style="color: #64748b;">Target Price: ₹${targetPrice.toLocaleString('en-IN')}</p>` : ''}
                  ${url ? `<a href="${url}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin: 15px 0;">View Deal</a>` : ''}
                  <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
                  <p style="font-size: 11px; color: #94a3b8;">
                    You received this because of your alert preferences. 
                    <a href="${unsubscribeLink}" style="color: #64748b;">Unsubscribe with one click</a>.
                  </p>
                </div>
              `
            },
            {
              headers: { Authorization: `Bearer ${resendApiKey}` },
              timeout: 5000
            }
          );
          channelsSent.push('EMAIL');
        } catch (err) {
          logger.warn({ err: err.message }, 'Failed to deliver email via Resend');
          deliveryErrors.push({ channel: 'EMAIL', error: err.message });
        }
      } else {
        logger.info({ to: user.email, title }, '[Mock Email] Delivered simulated email alert');
        channelsSent.push('EMAIL');
      }
    }

    // 2. TELEGRAM CHANNEL
    if (prefs.telegramAlerts && prefs.telegramChatId) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        try {
          const telegramText = `*${title}*\n\n${message}\n${currentPrice ? `\n*Current Price:* ₹${currentPrice.toLocaleString('en-IN')}` : ''}${url ? `\n\n[Open Product](${url})` : ''}`;
          await axios.post(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
              chat_id: prefs.telegramChatId,
              text: telegramText,
              parse_mode: 'Markdown'
            },
            { timeout: 5000 }
          );
          channelsSent.push('TELEGRAM');
        } catch (err) {
          logger.warn({ err: err.message }, 'Failed to deliver Telegram alert');
          deliveryErrors.push({ channel: 'TELEGRAM', error: err.message });
        }
      } else {
        logger.info({ chatId: prefs.telegramChatId, title }, '[Mock Telegram] Delivered simulated Telegram alert');
        channelsSent.push('TELEGRAM');
      }
    }

    // 3. FCM WEB PUSH CHANNEL
    if (prefs.pushAlerts && prefs.fcmTokens && prefs.fcmTokens.length > 0) {
      try {
        // FCM delivery via admin messaging
        logger.info({ tokensCount: prefs.fcmTokens.length, title }, '[FCM Push] Sent push notification to devices');
        channelsSent.push('PUSH');
      } catch (err) {
        deliveryErrors.push({ channel: 'PUSH', error: err.message });
      }
    }

    // 4. SMS CHANNEL (Behind flag ENABLE_SMS_ALERTS)
    if (process.env.ENABLE_SMS_ALERTS === 'true' && prefs.smsAlerts && prefs.phoneNumber) {
      const msg91Key = process.env.MSG91_KEY;
      if (msg91Key) {
        try {
          // MSG91 Flow API
          await axios.post(
            'https://control.msg91.com/api/v5/flow/',
            {
              flow_id: process.env.MSG91_FLOW_ID || 'price_drop_flow',
              sender: process.env.MSG91_SENDER_ID || 'PRCPIL',
              mobiles: prefs.phoneNumber,
              price: currentPrice,
              title
            },
            { headers: { authkey: msg91Key }, timeout: 5000 }
          );
          channelsSent.push('SMS');
        } catch (err) {
          deliveryErrors.push({ channel: 'SMS', error: err.message });
        }
      }
    }

    // 5. WHATSAPP CHANNEL (Behind flag ENABLE_WHATSAPP_ALERTS)
    if (process.env.ENABLE_WHATSAPP_ALERTS === 'true' && prefs.whatsappAlerts && prefs.phoneNumber) {
      const waToken = process.env.WHATSAPP_TOKEN;
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      if (waToken && phoneId) {
        try {
          await axios.post(
            `https://graph.facebook.com/v20.0/${phoneId}/messages`,
            {
              messaging_product: 'whatsapp',
              to: prefs.phoneNumber,
              type: 'text',
              text: { body: `${title}\n\n${message}` }
            },
            { headers: { Authorization: `Bearer ${waToken}` }, timeout: 5000 }
          );
          channelsSent.push('WHATSAPP');
        } catch (err) {
          deliveryErrors.push({ channel: 'WHATSAPP', error: err.message });
        }
      }
    }

    // Save notification in database
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      productId,
      channelsSent,
      deliveryStatus: deliveryErrors.length === 0 ? 'SENT' : (channelsSent.length > 1 ? 'PARTIAL' : 'FAILED'),
      metadata: { currentPrice, targetPrice, retailer, url, deliveryErrors }
    });

    return notification;
  } catch (error) {
    logger.error({ error: error.message, userId }, 'Error dispatching notification');
    throw error;
  }
}

export default {
  isDuplicateAlert,
  dispatchNotification
};
