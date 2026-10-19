import mongoose from 'mongoose';

const offerRuleSchema = new mongoose.Schema(
  {
    retailer: {
      type: String,
      required: true,
      index: true
    },
    bank: {
      type: String,
      required: true,
      index: true
    },
    cardType: {
      type: String,
      enum: ['Credit', 'Debit', 'All'],
      default: 'All'
    },
    cardName: {
      type: String,
      trim: true
    },
    discountType: {
      type: String,
      enum: ['instant_percent', 'instant_flat', 'cashback_percent', 'cashback_flat'],
      required: true
    },
    percent: {
      type: Number,
      required: true
    },
    cap: {
      type: Number,
      default: null
    },
    minSpend: {
      type: Number,
      default: 0
    },
    validFrom: {
      type: Date,
      default: Date.now
    },
    validTo: {
      type: Date,
      required: true,
      index: true
    },
    source: {
      type: String,
      enum: ['verified_bank_feed', 'retailer_promo', 'affiliate_feed', 'gemini_extracted', 'admin_curated'],
      default: 'admin_curated'
    },
    verifiedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['verified', 'unverified'],
      default: 'verified',
      index: true
    },
    description: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

offerRuleSchema.index({ retailer: 1, bank: 1, status: 1 });

const OfferRule = mongoose.model('OfferRule', offerRuleSchema);

export default OfferRule;
