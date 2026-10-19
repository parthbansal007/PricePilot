import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    type: {
      type: String, // 'PRICE_DROP', 'TARGET_PRICE', 'SYSTEM'
      required: true,
      enum: ['PRICE_DROP', 'TARGET_PRICE', 'SYSTEM']
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    productId: {
      type: String, // optional, to link to product
    },
    read: {
      type: Boolean,
      default: false,
    },
    channelsSent: [{
      type: String,
      enum: ['IN_APP', 'EMAIL', 'TELEGRAM', 'PUSH', 'SMS', 'WHATSAPP']
    }],
    deliveryStatus: {
      type: String,
      enum: ['SENT', 'PARTIAL', 'FAILED', 'SUPPRESSED'],
      default: 'SENT'
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
