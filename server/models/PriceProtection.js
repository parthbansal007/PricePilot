import mongoose from 'mongoose';

const priceProtectionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    productId: {
      type: String,
      required: true
    },
    productTitle: {
      type: String,
      required: true
    },
    purchasePrice: {
      type: Number,
      required: true
    },
    purchaseDate: {
      type: Date,
      default: Date.now
    },
    protectionDays: {
      type: Number,
      default: 14
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    retailer: {
      type: String,
      default: 'Amazon.in'
    },
    orderId: {
      type: String,
      default: ''
    },
    lowestPriceSeen: {
      type: Number,
      required: true
    },
    potentialRefund: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'CLAIMED', 'EXPIRED'],
      default: 'ACTIVE'
    },
    lastCheckedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const PriceProtection = mongoose.model('PriceProtection', priceProtectionSchema);

export default PriceProtection;
