import mongoose from 'mongoose';

const trackedProductSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // String to match Firebase UID
      required: true,
      index: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    targetPrice: {
      type: Number, // Optional target price
    },
    active: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

// Ensure a user only tracks a product once
trackedProductSchema.index({ userId: 1, productId: 1 }, { unique: true });

const TrackedProduct = mongoose.model('TrackedProduct', trackedProductSchema);

export default TrackedProduct;
