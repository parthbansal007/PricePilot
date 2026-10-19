import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    canonicalProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CanonicalProduct',
      required: true,
      index: true
    },
    retailer: {
      type: String,
      required: true,
      index: true
    },
    price: {
      type: Number,
      required: true
    },
    mrp: {
      type: Number
    },
    currency: {
      type: String,
      default: 'INR'
    },
    url: {
      type: String,
      required: true
    },
    sourceUrl: {
      type: String
    },
    isDirectRetailerUrl: {
      type: Boolean,
      default: false
    },
    availability: {
      type: String,
      default: 'In Stock'
    },
    lastCheckedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    source: {
      type: String,
      enum: ['provider', 'retailer-api', 'extension', 'user'],
      default: 'provider'
    },
    trustLevel: {
      type: String,
      enum: ['high', 'standard', 'unverified'],
      default: 'standard'
    },
    provider: {
      type: String,
      default: 'serpapi'
    },
    providerProductId: {
      type: String,
      index: true
    }
  },
  {
    timestamps: true
  }
);

offerSchema.index({ canonicalProductId: 1, retailer: 1 }, { unique: false });
offerSchema.index({ canonicalProductId: 1, price: 1 });

const Offer = mongoose.model('Offer', offerSchema);

export default Offer;
