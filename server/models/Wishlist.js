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
    targetPrice: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['watching', 'price-dropped', 'ready', 'purchased'],
      default: 'watching',
      index: true,
    },
    currency: {
      type: String,
      default: 'INR',
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
