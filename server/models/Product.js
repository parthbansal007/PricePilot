import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      default: 'serpapi'
    },
    providerProductId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
    },
    normalizedTitle: {
      type: String,
      index: true
    },
    brand: {
      type: String,
      index: true
    },
    productFamily: String,
    model: String,
    modelNumber: {
      type: String,
      index: true
    },
    specifications: {
      cpu: String,
      gpu: String,
      ram: String,
      storage: String,
      displaySize: String,
      resolution: String,
      refreshRate: String
    },
    image: String,
    retailer: String,
    retailerProductId: String,
    productUrl: String,
    sourceUrl: String,
    isDirectRetailerUrl: {
      type: Boolean,
      default: false
    },
    currentPrice: Number,
    currency: {
      type: String,
      default: 'INR',
    },
    rating: Number,
    availability: String,
    matchScore: Number
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model('Product', productSchema);

export default Product;
