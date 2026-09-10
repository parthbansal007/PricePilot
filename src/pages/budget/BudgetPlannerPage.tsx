import React, { useState, useEffect } from 'react';
import { PieChart as PieChartIcon, Plus, IndianRupee, Save, X, TrendingUp, Filter } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../services/api';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';

export function BudgetPlannerPage() {
  const [budget, setBudget] = useState(50000);
  const [spent, setSpent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudget, setNewBudget] = useState(50000);

  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '', amount: '', category: 'Electronics', date: new Date().toISOString().split('T')[0]
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      // 1. Load Summary
      const summaryRes = await api.get('/budget/summary');
      if (summaryRes.data) {
        const summary = summaryRes.data;
        setBudget(summary.monthlyLimit);
        setNewBudget(summary.monthlyLimit);
        setSpent(summary.totalSpent);
        setRemaining(summary.remaining);
        
        const catArray = Object.keys(summary.categoryTotals).map(key => ({
          name: key, value: summary.categoryTotals[key]
        }));
        setCategoryData(catArray);
      }

      // 2. Load Expenses
      const expensesRes = await api.get(`/budget/expenses?page=${page}&limit=10`);
      if (expensesRes.data) {
        const data = expensesRes.data;
        setExpenses(data.expenses);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to load dashboard', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBudget = async () => {
    try {
      const res = await api.put('/budget', { monthlyLimit: newBudget });
      if (res.data) {
        setBudget(newBudget);
        setRemaining(newBudget - spent);
        setIsEditingBudget(false);
      }
    } catch (error) {
      console.error('Failed to update budget', error);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount) return;
    try {
      const res = await api.post('/budget/expenses', {
        title: expenseForm.title,
        amount: Number(expenseForm.amount),
        category: expenseForm.category,
        date: expenseForm.date
      });
      if (res.data) {
        setIsAddingExpense(false);
        setExpenseForm({ title: '', amount: '', category: 'Electronics', date: new Date().toISOString().split('T')[0] });
        loadDashboard(); // reload to get updated totals and list
      }
    } catch (error) {
      console.error('Failed to add expense', error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
     try {
      const res = await api.delete(`/budget/expenses/${id}`);
      if (res.data) {
        loadDashboard();
      }
     } catch (e) {
       console.error(e);
     }
  }

  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

  // Mock trend data for visualization if we don't have enough history
  const trendData = [
    { name: '1st', spent: Math.max(0, spent * 0.1) },
    { name: '8th', spent: Math.max(0, spent * 0.3) },
    { name: '15th', spent: Math.max(0, spent * 0.5) },
    { name: '22nd', spent: Math.max(0, spent * 0.8) },
    { name: 'Today', spent: spent }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Personal Shopping & Expense Manager</h1>
        <p className="text-textSecondary text-sm mt-1">Track everything. Unlimited records. Smart analytics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-borderLight shadow-sm flex flex-col justify-center text-center">
          <p className="text-textSecondary font-medium mb-1 text-sm">Monthly Budget</p>
          {isEditingBudget ? (
            <div className="flex items-center justify-center gap-2 mb-4 mt-1">
              <span className="text-xl font-bold">₹</span>
              <Input type="number" value={newBudget} onChange={(e) => setNewBudget(Number(e.target.value))} className="w-24 text-center p-1" />
              <button onClick={handleUpdateBudget} className="p-1 bg-primary/10 text-primary rounded"><Save className="w-4 h-4" /></button>
              <button onClick={() => setIsEditingBudget(false)} className="p-1 bg-secondaryBg rounded"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <h2 className="text-2xl font-bold text-textPrimary mb-2">₹{budget.toLocaleString()}</h2>
          )}
          {!isEditingBudget && <Button variant="outline" size="sm" onClick={() => setIsEditingBudget(true)} className="mx-auto mt-2">Edit Budget</Button>}
        </div>

        <div className="bg-white p-6 rounded-xl border border-borderLight shadow-sm text-center">
          <p className="text-textSecondary font-medium mb-1 text-sm">Spent</p>
          <h2 className="text-2xl font-bold text-danger">₹{spent.toLocaleString()}</h2>
          <div className="w-full bg-secondaryBg h-1.5 rounded-full mt-4">
            <div className="bg-danger h-full rounded-full" style={{ width: `${Math.min((spent / budget) * 100, 100)}%` }}></div>
          </div>
          <p className="text-xs text-textSecondary mt-2">{((spent/budget)*100).toFixed(0)}% Used</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-borderLight shadow-sm text-center">
          <p className="text-textSecondary font-medium mb-1 text-sm">Remaining</p>
          <h2 className={`text-2xl font-bold ${remaining < 0 ? 'text-danger' : 'text-accent'}`}>₹{remaining.toLocaleString()}</h2>
          {remaining < 0 && <p className="text-xs text-danger mt-2 font-medium">Over budget by ₹{Math.abs(remaining).toLocaleString()}</p>}
        </div>
        
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-xl border border-primary/20 shadow-sm text-center flex flex-col justify-center">
           <h3 className="text-sm font-bold text-primary mb-2">Spending Insight</h3>
           <p className="text-xs text-textPrimary">
             {categoryData.length > 0 
               ? `${categoryData.sort((a,b)=>b.value-a.value)[0].name} is your largest spending category this month.`
               : "Start tracking to get personalized financial insights."}
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-borderLight shadow-sm">
          <h2 className="text-lg font-bold text-textPrimary mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Spending Trend
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val/1000}k`} />
                <RechartsTooltip formatter={(value) => `₹${value}`} />
                <Line type="monotone" dataKey="spent" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-borderLight shadow-sm">
          <h2 className="text-lg font-bold text-textPrimary mb-6 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-primary" /> Category Breakdown
          </h2>
          <div className="h-64">
            {categoryData.length === 0 ? (
               <div className="h-full flex items-center justify-center text-textSecondary text-sm">No expenses recorded yet.</div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value) => `₹${value}`} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white p-6 rounded-xl border border-borderLight shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-primary" /> Recent Expenses
          </h2>
          <Button size="sm" className="flex items-center gap-1" onClick={() => setIsAddingExpense(!isAddingExpense)}>
            {isAddingExpense ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {isAddingExpense ? 'Cancel' : 'Add Expense'}
          </Button>
        </div>

        {isAddingExpense && (
          <form onSubmit={handleAddExpense} className="mb-6 p-5 bg-secondaryBg rounded-lg border border-borderLight grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input placeholder="Expense Title" value={expenseForm.title} onChange={(e) => setExpenseForm({...expenseForm, title: e.target.value})} required className="md:col-span-2" />
            <Input type="number" placeholder="Amount (₹)" value={expenseForm.amount} onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})} required />
            <select value={expenseForm.category} onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})} className="bg-background border border-borderLight rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-primary">
              <option value="Electronics">Electronics</option>
              <option value="Clothing">Clothing</option>
              <option value="Groceries">Groceries</option>
              <option value="Food">Food</option>
              <option value="Travel">Travel</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Subscriptions">Subscriptions</option>
              <option value="Home">Home</option>
              <option value="Other">Other</option>
            </select>
            <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})} required />
            <div className="md:col-span-5 flex justify-end">
               <Button type="submit" size="sm">Save Expense</Button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-borderLight text-textSecondary text-sm font-medium">
                <th className="pb-3 px-2">Date</th>
                <th className="pb-3 px-2">Item</th>
                <th className="pb-3 px-2">Category</th>
                <th className="pb-3 px-2 text-right">Amount</th>
                <th className="pb-3 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-6 text-textSecondary text-sm">Loading expenses...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-6 text-textSecondary text-sm">No expenses found for this period.</td></tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense._id} className="border-b border-borderLight/50 last:border-0 hover:bg-secondaryBg/30 transition-colors">
                    <td className="py-4 px-2 text-sm text-textSecondary">{new Date(expense.date).toLocaleDateString()}</td>
                    <td className="py-4 px-2 text-sm font-semibold text-textPrimary">{expense.title}</td>
                    <td className="py-4 px-2">
                      <span className="px-2 py-1 bg-secondaryBg border border-borderLight rounded-full text-xs text-textSecondary">{expense.category}</span>
                    </td>
                    <td className="py-4 px-2 text-sm font-bold text-textPrimary text-right">₹{expense.amount.toLocaleString()}</td>
                    <td className="py-4 px-2 text-right">
                       <button onClick={() => handleDeleteExpense(expense._id)} className="text-danger hover:underline text-xs">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
           <div className="flex items-center justify-between mt-6 border-t border-borderLight pt-4">
             <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page-1)}>Previous</Button>
             <span className="text-sm text-textSecondary">Page {page} of {totalPages}</span>
             <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page+1)}>Next</Button>
           </div>
        )}
      </div>
    </div>
  );
}
