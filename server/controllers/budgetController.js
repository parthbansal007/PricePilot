import Budget from '../models/Budget.js';
import Expense from '../models/Expense.js';
import SavingsGoal from '../models/SavingsGoal.js';
import mongoose from 'mongoose';

// @desc    Get user budget
// @route   GET /api/budget
// @access  Private
export const getBudget = async (req, res) => {
  try {
    const userId = req.user.uid;
    let budget = await Budget.findOne({ userId });

    if (!budget) {
      budget = await Budget.create({ userId, monthlyLimit: 50000, categoryBudgets: {} });
    }

    res.json(budget);
  } catch (error) {
    console.error('Budget fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching budget.' });
  }
};

// @desc    Update budget
// @route   PUT /api/budget
// @access  Private
export const updateBudget = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { monthlyLimit, categoryBudgets, customCategories } = req.body;

    let budget = await Budget.findOne({ userId });
    
    if (!budget) {
      budget = await Budget.create({ userId, monthlyLimit, categoryBudgets, customCategories });
    } else {
      if (monthlyLimit !== undefined) budget.monthlyLimit = monthlyLimit;
      if (categoryBudgets !== undefined) budget.categoryBudgets = categoryBudgets;
      if (customCategories !== undefined) budget.customCategories = customCategories;
      await budget.save();
    }

    res.json(budget);
  } catch (error) {
    console.error('Budget update error:', error);
    res.status(500).json({ message: 'Server error while updating budget.' });
  }
};

// @desc    Get expenses with pagination and filtering
// @route   GET /api/budget/expenses
// @access  Private
export const getExpenses = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { page = 1, limit = 25, category, search } = req.query;
    
    const query = { userId };
    if (category) query.category = category;
    if (search) query.title = { $regex: search, $options: 'i' };

    const expenses = await Expense.find(query)
      .sort({ date: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Expense.countDocuments(query);

    res.json({
      expenses,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    console.error('Expense fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching expenses.' });
  }
};

// @desc    Add expense
// @route   POST /api/budget/expenses
// @access  Private
export const addExpense = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { title, amount, category, date, retailer, paymentMethod, notes, productId, type } = req.body;

    if (!amount || !category || !title) {
      return res.status(400).json({ message: 'Amount, category, and title are required' });
    }

    const expenseData = {
      userId, title, amount, category,
      date: date || Date.now(),
      retailer, paymentMethod, notes, type: type || 'EXPENSE'
    };
    if (productId) expenseData.productId = productId;

    const expense = await Expense.create(expenseData);
    res.status(201).json(expense);
  } catch (error) {
    console.error('Expense add error:', error);
    res.status(500).json({ message: 'Server error while adding expense.' });
  }
};

// @desc    Update expense
// @route   PATCH /api/budget/expenses/:id
// @access  Private
export const updateExpense = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    const expense = await Expense.findOneAndUpdate(
      { _id: id, userId },
      req.body,
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Expense update error:', error);
    res.status(500).json({ message: 'Server error while updating expense.' });
  }
};

// @desc    Delete expense
// @route   DELETE /api/budget/expenses/:id
// @access  Private
export const deleteExpense = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    const expense = await Expense.findOneAndDelete({ _id: id, userId });
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Expense delete error:', error);
    res.status(500).json({ message: 'Server error while deleting expense.' });
  }
};

// @desc    Get expense summary (totals, categories)
// @route   GET /api/budget/summary
// @access  Private
export const getExpenseSummary = async (req, res) => {
  try {
    const userId = req.user.uid;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const expenses = await Expense.find({
      userId,
      date: { $gte: startOfMonth },
      type: { $in: ['EXPENSE', 'PURCHASE'] }
    });

    const totalSpent = expenses.reduce((acc, exp) => acc + exp.amount, 0);

    const categoryTotals = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    const budget = await Budget.findOne({ userId });
    const monthlyLimit = budget ? budget.monthlyLimit : 0;
    const remaining = monthlyLimit - totalSpent;

    res.json({
      totalSpent,
      monthlyLimit,
      remaining,
      categoryTotals
    });
  } catch (error) {
    console.error('Expense summary error:', error);
    res.status(500).json({ message: 'Server error while fetching expense summary.' });
  }
};

// @desc    Get Savings Goals
// @route   GET /api/budget/savings-goals
// @access  Private
export const getSavingsGoals = async (req, res) => {
  try {
    const userId = req.user.uid;
    const goals = await SavingsGoal.find({ userId });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching savings goals.' });
  }
};

// @desc    Add Savings Goal
// @route   POST /api/budget/savings-goals
// @access  Private
export const addSavingsGoal = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { title, targetAmount, targetDate, productId } = req.body;
    
    const goalData = { userId, title, targetAmount, targetDate };
    if (productId) goalData.productId = productId;
    
    const goal = await SavingsGoal.create(goalData);
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ message: 'Server error while creating savings goal.' });
  }
};
