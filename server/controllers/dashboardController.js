import TrackedProduct from '../models/TrackedProduct.js';
import Wishlist from '../models/Wishlist.js';
import Budget from '../models/Budget.js';
import Expense from '../models/Expense.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

// @desc    Get dashboard metrics
// @route   GET /api/dashboard
// @access  Private
export const getDashboardMetrics = async (req, res) => {
  try {
    const userId = req.user.uid;

    const [trackedCount, wishlistCount, user, budget] = await Promise.all([
      TrackedProduct.countDocuments({ userId, active: true }),
      Wishlist.countDocuments({ userId }),
      User.findOne({ firebaseUid: userId }),
      Budget.findOne({ userId })
    ]);

    const budgetTotal = budget?.monthlyLimit || user?.monthlyBudget || 0;

    // Calculate current month's expenses
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const expenses = await Expense.find({
      userId,
      date: { $gte: startOfMonth },
      type: { $in: ['EXPENSE', 'PURCHASE'] }
    });
    const totalSpent = expenses.reduce((acc, exp) => acc + exp.amount, 0);
    const budgetRemaining = Math.max(0, budgetTotal - totalSpent);

    res.json({
      trackedCount,
      wishlistCount,
      budgetRemaining,
      budgetTotal,
      totalSpent
    });
  } catch (error) {
    logger.error({ requestId: req.id, error: error.message }, 'Dashboard metrics error');
    res.status(500).json({ message: 'Server error while fetching dashboard metrics.' });
  }
};
