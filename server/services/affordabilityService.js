import Budget from '../models/Budget.js';
import Expense from '../models/Expense.js';
import SavingsGoal from '../models/SavingsGoal.js';
import logger from '../utils/logger.js';

/**
 * Affordability Planner
 * Evaluates impact now vs after N weeks, category limits,
 * and finds the earliest safe purchase date without breaching essentials.
 *
 * @param {string} userId
 * @param {number} effectivePrice
 * @param {string} [category='electronics']
 * @returns {Promise<Object>} Affordability plan
 */
export async function planAffordability(userId, effectivePrice, category = 'electronics') {
  if (!userId || effectivePrice <= 0) {
    return {
      hasBudget: false,
      affordableNow: true,
      monthlyBudget: 0,
      remainingBudget: 0,
      budgetImpactPercent: 0,
      deficitAmount: 0,
      earliestSafeDate: new Date(),
      weeksToAfford: 0,
      projections: [],
      advice: 'No personal budget constraints configured. Purchase does not breach budget.'
    };
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // 1. Fetch User Budget & Expenses
  let budget = null;
  let expenses = [];
  let savingsGoals = [];

  try {
    budget = await Budget.findOne({ userId }).lean();
    expenses = await Expense.find({
      userId,
      date: { $gte: startOfMonth },
      type: { $in: ['EXPENSE', 'PURCHASE'] }
    }).lean();
    savingsGoals = await SavingsGoal.find({ userId }).lean();
  } catch (err) {
    logger.warn({ userId, error: err.message }, 'Failed to query user budget data for affordability planning');
  }

  const allocatedSavings = (savingsGoals || []).reduce((sum, g) => sum + (g.currentAmount || 0), 0);

  if (!budget || !budget.monthlyLimit || budget.monthlyLimit <= 0) {
    return {
      hasBudget: false,
      affordableNow: true,
      monthlyBudget: 0,
      remainingBudget: 0,
      allocatedSavings,
      budgetImpactPercent: 0,
      deficitAmount: 0,
      earliestSafeDate: now,
      weeksToAfford: 0,
      projections: [
        { week: 1, availableFunds: 0, status: 'UNKNOWN' },
        { week: 2, availableFunds: 0, status: 'UNKNOWN' },
        { week: 4, availableFunds: 0, status: 'UNKNOWN' }
      ],
      advice: 'Set a monthly budget in Budget Planner to activate automated affordability forecasting.'
    };
  }

  const monthlyLimit = budget.monthlyLimit;
  const totalSpent = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const remainingBudget = Math.max(0, monthlyLimit - totalSpent);

  const categorySpent = expenses
    .filter(e => e.category && e.category.toLowerCase().includes(category.toLowerCase()))
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const budgetImpactPercent = Math.min(100, Math.round((effectivePrice / monthlyLimit) * 100));
  const affordableNow = effectivePrice <= remainingBudget;
  const deficitAmount = Math.max(0, effectivePrice - remainingBudget);

  // 2. Compute Weekly Savings Velocity
  // Approximate weekly discretionary savings: monthlyLimit / 4.33
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemainingInMonth = Math.max(1, daysInMonth - dayOfMonth);
  const dailyBurnRate = dayOfMonth > 0 ? totalSpent / dayOfMonth : 0;
  const projectedMonthEndSpent = totalSpent + (dailyBurnRate * daysRemainingInMonth);
  const projectedSurplus = Math.max(2000, monthlyLimit - projectedMonthEndSpent);
  const weeklySavingsVelocity = Math.max(1000, Math.round(projectedSurplus / 4));

  // 3. Projections for 1, 2, 4, 8 weeks
  const projections = [];
  const weeks = [1, 2, 4, 8];

  for (const w of weeks) {
    // If the target week crosses into next month, budget resets
    const targetDate = new Date(now.getTime() + w * 7 * 24 * 60 * 60 * 1000);
    const isNextMonth = targetDate.getMonth() !== now.getMonth();

    const projectedAccumulated = isNextMonth
      ? monthlyLimit + (w * weeklySavingsVelocity * 0.5)
      : remainingBudget + (w * weeklySavingsVelocity);

    projections.push({
      week: w,
      targetDate: targetDate.toISOString(),
      projectedFunds: Math.round(projectedAccumulated),
      canAfford: projectedAccumulated >= effectivePrice
    });
  }

  // 4. Determine Earliest Safe Purchase Date
  let earliestSafeDate = now;
  let weeksToAfford = 0;

  if (affordableNow) {
    earliestSafeDate = now;
    weeksToAfford = 0;
  } else if (effectivePrice <= monthlyLimit) {
    // Fits in a fresh month's budget without breaching essentials
    earliestSafeDate = nextMonthStart;
    const diffDays = Math.ceil((nextMonthStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    weeksToAfford = Math.max(1, Math.ceil(diffDays / 7));
  } else {
    // Multi-month saving needed
    const additionalNeeded = effectivePrice - monthlyLimit;
    const extraWeeks = Math.ceil(additionalNeeded / weeklySavingsVelocity);
    weeksToAfford = Math.ceil((nextMonthStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 7)) + extraWeeks;
    earliestSafeDate = new Date(now.getTime() + weeksToAfford * 7 * 24 * 60 * 60 * 1000);
  }

  // 5. Synthesize Actionable Advice
  let advice = '';
  if (affordableNow) {
    const afterPurchase = remainingBudget - effectivePrice;
    advice = `Purchase fits comfortably in your current budget. You will have ₹${afterPurchase.toLocaleString()} remaining this month.`;
  } else if (effectivePrice <= monthlyLimit) {
    const dateFormatted = nextMonthStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    advice = `Exceeds current month's remaining budget by ₹${deficitAmount.toLocaleString()}. Earliest safe purchase date is ${dateFormatted} when monthly budget resets.`;
  } else {
    const dateFormatted = earliestSafeDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    advice = `Total cost (₹${effectivePrice.toLocaleString()}) exceeds single-month limit (₹${monthlyLimit.toLocaleString()}). Recommended plan: Save ₹${weeklySavingsVelocity.toLocaleString()}/week to purchase safely by ${dateFormatted}.`;
  }

  return {
    hasBudget: true,
    affordableNow,
    monthlyBudget: monthlyLimit,
    remainingBudget,
    effectivePrice,
    budgetImpactPercent,
    deficitAmount,
    categorySpent,
    earliestSafeDate,
    weeksToAfford,
    projections,
    advice
  };
}

export default { planAffordability };
