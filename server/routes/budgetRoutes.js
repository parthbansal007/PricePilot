import express from 'express';
import { z } from 'zod';
import { 
  getBudget, updateBudget, 
  getExpenses, addExpense, updateExpense, deleteExpense, getExpenseSummary,
  getSavingsGoals, addSavingsGoal
} from '../controllers/budgetController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

const updateBudgetSchema = {
  body: z.object({
    monthlyLimit: z.number().nonnegative('Monthly limit cannot be negative').optional(),
    currency: z.string().optional()
  })
};

const addExpenseSchema = {
  body: z.object({
    amount: z.number().positive('Expense amount must be greater than zero'),
    category: z.string().min(1, 'Category is required'),
    description: z.string().optional(),
    date: z.string().optional(),
    type: z.enum(['EXPENSE', 'PURCHASE']).optional()
  })
};

const idParamSchema = {
  params: z.object({
    id: z.string().min(1, 'ID is required')
  })
};

const addSavingsGoalSchema = {
  body: z.object({
    name: z.string().min(1, 'Goal name is required'),
    targetAmount: z.number().positive('Target amount must be positive'),
    currentAmount: z.number().nonnegative().optional(),
    targetDate: z.string().optional(),
    category: z.string().optional()
  })
};

// Budget settings
router.get('/', protect, getBudget);
router.put('/', protect, validateRequest(updateBudgetSchema), updateBudget);
router.get('/summary', protect, getExpenseSummary);

// Expenses
router.get('/expenses', protect, getExpenses);
router.post('/expenses', protect, validateRequest(addExpenseSchema), addExpense);
router.patch('/expenses/:id', protect, validateRequest(idParamSchema), updateExpense);
router.delete('/expenses/:id', protect, validateRequest(idParamSchema), deleteExpense);

// Savings Goals
router.get('/savings-goals', protect, getSavingsGoals);
router.post('/savings-goals', protect, validateRequest(addSavingsGoalSchema), addSavingsGoal);

export default router;
