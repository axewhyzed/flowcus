// src/services/apiClient.ts
import axios from 'axios';
import { getAuth, saveAuth, clearAuth } from './storage';
import { API_URL } from '@env';

// REPLACE with your machine's local IP address (e.g., 192.168.1.x)
// Android Emulator uses 10.0.2.2, but physical devices need real IP.
//export const API_URL = 'https://flowcus-productivity.onrender.com/api'; 

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

debugger;

// 1. Request Interceptor: Attach Token
apiClient.interceptors.request.use(
  async (config) => {
    debugger;
    const authData = await getAuth();
    if (authData?.accessToken) {
      config.headers.Authorization = `Bearer ${authData.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Handle 401 Token Expiry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
debugger;
    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const authData = await getAuth();
        if (!authData?.refreshToken) throw new Error('No refresh token');

        // Call Backend to Refresh
        // We use axios.post directly to avoid circular interceptor calls
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
            token: authData.refreshToken
        });

        const { token: newAccessToken, refreshToken: newRefreshToken } = response.data;

        // Save new tokens
        await saveAuth({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        });

        // Update header and retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails, user must log in again
        await clearAuth();
        // You might want to trigger a Redux action here to reset state
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;