import api from './api';

export const dashboardService = {
  getDashboardMetrics: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  }
};
