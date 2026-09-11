import axios from 'axios';
import { auth } from './firebase';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api'),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the Firebase token to requests
api.interceptors.request.use(
  async (config) => {
    // If we have a Firebase user, get their ID token
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error getting Firebase token:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration/unauthorized access globally
api.interceptors.response.use(
  (response) => {
    // Catch misconfigured API URLs that return the SPA's index.html
    if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
      console.error('API Error: Received HTML instead of JSON. VITE_API_BASE_URL might be misconfigured.');
      return Promise.reject(new Error('Invalid API response'));
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login if unauthorized
      // Let the AuthContext handle state if possible, but here we can just clean up
      localStorage.removeItem('pricepilot_user');
      
      // Do not hard redirect on sync or if already on login page
      if (window.location.pathname !== '/login' && !error.config.url?.includes('/auth/sync')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
