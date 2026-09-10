import express from 'express';
import { 
  getBudget, updateBudget, 
  getExpenses, addExpense, updateExpense, deleteExpense, getExpenseSummary,
  getSavingsGoals, addSavingsGoal
} from '../controllers/budgetController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Budget settings
router.get('/', protect, getBudget);
router.put('/', protect, updateBudget);
router.get('/summary', protect, getExpenseSummary);

// Expenses
router.get('/expenses', protect, getExpenses);
router.post('/expenses', protect, addExpense);
router.patch('/expenses/:id', protect, updateExpense);
router.delete('/expenses/:id', protect, deleteExpense);

// Savings Goals
router.get('/savings-goals', protect, getSavingsGoals);
router.post('/savings-goals', protect, addSavingsGoal);

export default router;
