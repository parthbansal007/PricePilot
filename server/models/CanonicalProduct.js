import mongoose from 'mongoose';

const canonicalProductSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      index: true
    },
    normalizedTitle: {
      type: String,
      index: true
    },
    brand: {
      type: String,
      index: true
    },
    model: String,
    modelNumber: {
      type: String,
      index: true
    },
    gtin: {
      type: String,
      index: true,
      sparse: true
    },
    mpn: {
      type: String,
      index: true,
      sparse: true
    },
    asin: {
      type: String,
      index: true,
      sparse: true
    },
    category: {
      type: String,
      index: true
    },
    productFamily: String,
    normalizedSpecs: {
      cpu: String,
      gpu: String,
      ram: String,
      storage: String,
      displaySize: String,
      resolution: String,
      refreshRate: String,
      color: String
    },
    images: [{
      type: String
    }],
    primaryImage: String,
    aliases: [{
      type: String
    }],
    icecatId: {
      type: String,
      index: true,
      sparse: true
    },
    rating: Number,
    reviewCount: Number,
    matchConfidence: Number
  },
  {
    timestamps: true
  }
);

canonicalProductSchema.index({ brand: 1, model: 1 });
canonicalProductSchema.index({ normalizedTitle: 'text', brand: 'text', model: 'text' });

const CanonicalProduct = mongoose.model('CanonicalProduct', canonicalProductSchema);

export default CanonicalProduct;
