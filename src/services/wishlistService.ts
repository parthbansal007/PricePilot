import api from './api';

export const wishlistService = {
  getWishlist: async () => {
    const response = await api.get('/wishlist');
    return response.data;
  },
  addToWishlist: async (data: any) => {
    const response = await api.post('/wishlist', data);
    return response.data;
  },
  updateWishlistItem: async (id: string, data: { status?: string; targetPrice?: number }) => {
    const response = await api.patch(`/wishlist/${id}`, data);
    return response.data;
  },
  removeFromWishlist: async (id: string) => {
    const response = await api.delete(`/wishlist/${id}`);
    return response.data;
  }
};
