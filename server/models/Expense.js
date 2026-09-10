import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    category: {
      type: String,
      required: true,
      index: true
    },
    subcategory: {
      type: String
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    },
    type: {
      type: String,
      enum: ['PURCHASE', 'EXPENSE', 'REFUND', 'INCOME', 'SAVING'],
      default: 'EXPENSE'
    },
    paymentMethod: {
      type: String
    },
    retailer: {
      type: String
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    notes: {
      type: String
    },
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurringFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    nextDueDate: {
      type: Date
    }
  },
  {
    timestamps: true,
  }
);

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;
