import mongoose from 'mongoose';

const priceHistorySchema = new mongoose.Schema(
  {
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      index: true,
      sparse: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CanonicalProduct',
      index: true,
      sparse: true
    },
    price: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    retailer: {
      type: String,
      required: true,
      index: true
    },
    source: {
      type: String,
      default: 'serpapi'
    },
    sourceType: {
      type: String,
      enum: ['tracked', 'backfill', 'user', 'extension'],
      default: 'tracked',
      index: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

priceHistorySchema.index({ offerId: 1, timestamp: -1 });
priceHistorySchema.index({ productId: 1, timestamp: -1 });

const PriceHistory = mongoose.model('PriceHistory', priceHistorySchema);

export default PriceHistory;
