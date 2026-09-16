import axios from 'axios';
import { auth } from './firebase';

let baseUrl = import.meta.env.VITE_API_BASE_URL;

// Debugging: log what Vite injected
console.log("Vite injected VITE_API_BASE_URL as:", baseUrl);

if (baseUrl) {
  // Remove quotes if the user accidentally added them in Render dashboard
  baseUrl = baseUrl.replace(/^["']|["']$/g, '');
  if (!baseUrl.endsWith('/api') && !baseUrl.endsWith('/api/')) {
    baseUrl = baseUrl.replace(/\/$/, '') + '/api';
  }
} else if (import.meta.env.PROD) {
  // If undefined in production, warn the user they forgot to set it or rebuild
  console.warn("VITE_API_BASE_URL is missing in production! API calls will use relative path '/api' which will fail if frontend and backend are hosted on separate domains.");
}

const finalBaseUrl = baseUrl || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
console.log("Final computed API baseURL:", finalBaseUrl);

export const api = axios.create({
  baseURL: finalBaseUrl,
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
