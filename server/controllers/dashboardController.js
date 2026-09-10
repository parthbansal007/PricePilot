import TrackedProduct from '../models/TrackedProduct.js';
import Wishlist from '../models/Wishlist.js';
import Budget from '../models/Budget.js';

// @desc    Get dashboard metrics
// @route   GET /api/dashboard
// @access  Private
export const getDashboardMetrics = async (req, res) => {
  try {
    const userId = req.user.uid;

    const trackedCount = await TrackedProduct.countDocuments({ userId, active: true });
    const wishlistCount = await Wishlist.countDocuments({ userId });
    
    const user = await import('../models/User.js').then(m => m.default.findOne({ firebaseUid: userId }));
    let budget = await Budget.findOne({ userId });
    let budgetRemaining = 0;
    let budgetTotal = user?.monthlyBudget || 0;
    
    if (budget) {
      const spent = budget.expenses ? budget.expenses.reduce((sum, exp) => sum + exp.amount, 0) : 0;
      // Wait, expenses are in Expense collection, not budget.expenses!
      // Let's fetch expenses sum from Expense collection.
    }
    
    // Calculate total spent
    const Expense = await import('../models/Expense.js').then(m => m.default);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const expenses = await Expense.find({ userId, date: { $gte: startOfMonth }, type: { $in: ['EXPENSE', 'PURCHASE'] } });
    const totalSpent = expenses.reduce((acc, exp) => acc + exp.amount, 0);

    budgetRemaining = budgetTotal - totalSpent;

    res.json({
      trackedCount,
      wishlistCount,
      budgetRemaining,
      budgetTotal
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard metrics.' });
  }
};
