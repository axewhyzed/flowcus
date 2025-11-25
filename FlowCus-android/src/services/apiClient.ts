// src/services/apiClient.ts
import axios from 'axios';
import { getAuth, clearAuth } from './storage';
import { API_URL } from '@env';

// Use your machine's IP for physical devices, or 10.0.2.2 for Emulator
// export const API_URL = 'http://192.168.1.x:5000/api'; 

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Request Interceptor: Attach Token
apiClient.interceptors.request.use(
  async (config) => {
    const authData = await getAuth();
    if (authData?.accessToken) {
      config.headers.Authorization = `Bearer ${authData.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Handle Expiry (Simplified)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 (Unauthorized), it means the 7-day token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Since we removed the Refresh Token endpoint, we cannot refresh.
      // We must log the user out so they can sign in again to get a new 7-day token.
      
      await clearAuth();
      
      // Optional: You might want to trigger a navigation to Login screen here
      // or emit an event that your UI listens to.
      console.warn('Session expired. User logged out.');
      
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;