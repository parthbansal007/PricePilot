import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true
    },
    bank: {
      type: String,
      required: true,
      trim: true
    },
    network: {
      type: String,
      enum: ['Visa', 'Mastercard', 'RuPay', 'Amex', 'Other'],
      default: 'Visa'
    },
    type: {
      type: String,
      enum: ['Credit', 'Debit'],
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    last4: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const membershipSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true
    },
    program: {
      type: String,
      required: true,
      trim: true
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    cards: [cardSchema],
    memberships: [membershipSchema],
    emiPreference: {
      preferredTenureMonths: {
        type: Number,
        default: 0 // 0 means pay in full (no EMI)
      },
      preferNoCostOnly: {
        type: Boolean,
        default: true
      }
    }
  },
  {
    timestamps: true
  }
);

const Wallet = mongoose.model('Wallet', walletSchema);

export default Wallet;
