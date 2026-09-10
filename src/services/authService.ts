import { api } from './api';

export const authService = {
  syncUser: async (firebaseToken) => {
    try {
      const { data } = await api.post('/auth/sync', {}, {
        headers: { Authorization: `Bearer ${firebaseToken}` }
      });
      return data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Error syncing user');
      }
      throw new Error('Network error');
    }
  }
};
