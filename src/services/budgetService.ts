import api from './api';

export const budgetService = {
  getBudget: async () => {
    const response = await api.get('/budget');
    return response.data;
  },
  updateBudget: async (monthlyLimit: number) => {
    const response = await api.put('/budget', { monthlyLimit });
    return response.data;
  },
  addExpense: async (data: any) => {
    const response = await api.post('/budget/expenses', data);
    return response.data;
  },
  deleteExpense: async (id: string) => {
    const response = await api.delete(`/budget/expenses/${id}`);
    return response.data;
  }
};
