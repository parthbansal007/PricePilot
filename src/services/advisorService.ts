import api from './api';

export const advisorService = {
  getAIAdvice: async (data: { message: string, productId?: string }) => {
    const response = await api.post('/advisor', data);
    return response.data;
  }
};
