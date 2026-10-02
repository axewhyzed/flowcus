// src/services/apiClient.ts
import axios from 'axios';
import { getAuth, clearAuth } from './storage';
import { API_URL } from '@env';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Request Interceptor: Attach Token & Timezone Offset
apiClient.interceptors.request.use(
  async (config) => {
    const authData = await getAuth();
    if (authData?.accessToken) {
      config.headers.Authorization = `Bearer ${authData.accessToken}`;
    }

    // Attach client timezone offset for backend time sync
    config.headers['X-Timezone-Offset'] = new Date().getTimezoneOffset().toString();

    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Handle Expiry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      await clearAuth();
      console.warn('Session expired. User logged out.');
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;