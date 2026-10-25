// src/services/apiClient.ts
import axios from 'axios';
import { getAuth, clearAuth } from './storage';
import { API_BASE_URL } from '@env';
import { getClientTimezoneHeaders } from './timezoneHeaders';

const configuredBaseUrl = API_BASE_URL?.trim();
const developmentBaseUrl = __DEV__ ? 'http://10.0.2.2:7176/api' : undefined;
const apiBaseUrl = configuredBaseUrl || developmentBaseUrl;

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function getApiBaseUrl() {
  return apiBaseUrl || '';
}

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Request Interceptor: Attach Token & Timezone Offset
apiClient.interceptors.request.use(
  async (config) => {
    if (!apiBaseUrl) {
      return Promise.reject(new Error('API_BASE_URL must be configured for release builds.'));
    }
    if (!__DEV__ && !apiBaseUrl.startsWith('https://')) {
      return Promise.reject(new Error('API_BASE_URL must use HTTPS in release builds.'));
    }
    const authData = await getAuth();
    const isPublicAuthRoute = /\/auth\/(login|register)(?:\?|$)/i.test(config.url || '');
    if (authData?.accessToken && !isPublicAuthRoute) {
      config.headers.Authorization = `Bearer ${authData.accessToken}`;
    }

    // Send an IANA zone when available; omission preserves the legacy offset fallback.
    const timezoneHeaders = getClientTimezoneHeaders();
    config.headers['X-Timezone-Offset'] = timezoneHeaders['X-Timezone-Offset'];
    if (timezoneHeaders['X-Timezone-Id']) {
      config.headers['X-Timezone-Id'] = timezoneHeaders['X-Timezone-Id'];
    } else {
      delete config.headers['X-Timezone-Id'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Handle Expiry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const requestPath = String(originalRequest?.url || '').toLowerCase();
    const isCredentialValidation = requestPath.includes('/auth/change-password');
    const hadBearerToken = Boolean(originalRequest?.headers?.Authorization);
    if (error.response?.status === 401 && hadBearerToken && !isCredentialValidation && !originalRequest?._retry) {
      originalRequest._retry = true;
      await clearAuth();
      unauthorizedHandler?.();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
