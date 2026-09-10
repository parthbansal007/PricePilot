import api from './api';

export const trackingService = {
  getTrackedProducts: async () => {
    const response = await api.get('/tracking');
    return response.data;
  },
  addTracking: async (data: any) => {
    const response = await api.post('/tracking', data);
    return response.data;
  },
  removeTracking: async (id: string) => {
    const response = await api.delete(`/tracking/${id}`);
    return response.data;
  }
};
