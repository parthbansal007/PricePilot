import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
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
    image: {
      type: String,
    },
    currentPrice: {
      type: Number,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    retailer: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;
