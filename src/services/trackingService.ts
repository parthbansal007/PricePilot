import api from './api';

export const trackingService = {
  getTrackedProducts: async () => {
    const response = await api.get('/tracking');
    return response.data;
  },
  addTracking: async (dataOrId: any, targetPrice?: number, productName?: string) => {
    const payload = typeof dataOrId === 'object' && dataOrId !== null
      ? dataOrId
      : { productId: dataOrId, targetPrice, productName: productName || 'Tracked Product' };
    const response = await api.post('/tracking', payload);
    return response.data;
  },
  removeTracking: async (id: string) => {
    const response = await api.delete(`/tracking/${id}`);
    return response.data;
  }
};
