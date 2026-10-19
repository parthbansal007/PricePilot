import mongoose from 'mongoose';

const cacheEntrySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // MongoDB TTL index automatically removes expired entries
    },
    staleAt: {
      type: Date,
      index: true
    },
    hits: {
      type: Number,
      default: 0
    },
    tags: [{
      type: String,
      index: true
    }]
  },
  {
    timestamps: true
  }
);

const CacheEntry = mongoose.model('CacheEntry', cacheEntrySchema);

export default CacheEntry;
