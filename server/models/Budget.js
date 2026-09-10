import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true
    },
    monthlyLimit: {
      type: Number,
      required: true,
      default: 0
    },
    categoryBudgets: {
      type: Map,
      of: Number,
      default: {}
    },
    customCategories: [{
      type: String
    }]
  },
  {
    timestamps: true,
  }
);

const Budget = mongoose.model('Budget', budgetSchema);

export default Budget;
