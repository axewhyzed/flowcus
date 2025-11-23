// src/app/core/services/api.service.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { environment } from '../../../environments/environment';
import { ErrorHandlingService } from './error-handling.service';
import { AuthResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null; // memory-only

  constructor(
    private errorHandler: ErrorHandlingService,
    private router: Router
  ) {
    this.axiosInstance = axios.create({
      baseURL: environment.apiUrl,
      timeout: 30000,
      withCredentials: true, // important: send cookies (refresh token)
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Attach access token from memory (if present)
    this.axiosInstance.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    // Response interceptor: attempt refresh on 401 once, then retry
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 Unauthorized and not a refresh-token request and not retried yet
        if (
          error.response?.status === 401 &&
          originalRequest &&
          !originalRequest._retry &&
          !originalRequest.url.includes('auth/refresh-token')
        ) {
          originalRequest._retry = true;
          try {
            // Call refresh-token endpoint (server will read refresh cookie)
            // Use a raw axios call to avoid potential interceptor loops, but reuse baseURL/withCredentials.
            const refreshResp = await this.axiosInstance.post<AuthResponse>('auth/refresh-token');

            if (refreshResp.data && refreshResp.data.token) {
              this.setAccessToken(refreshResp.data.token);
              // set header on original and retry
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed -> ensure clean state and redirect to login
            this.setAccessToken(null);
            try {
              // Avoid navigation during interceptor if router not ready; still best-effort
              this.router.navigate(['/login']);
            } catch (e) {
              /* ignore navigation error */
            }
            return Promise.reject(refreshError);
          }
        }

        // Let centralized error handler run (logs, toasts etc.)
        this.errorHandler.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  // Public: set/clear token in memory and axios defaults
  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.axiosInstance.defaults.headers.common['Authorization'];
    }
  }

  getAccessToken() {
    return this.accessToken;
  }

  // Basic wrappers
  async get<T>(url: string, params?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.delete(url);
    return response.data;
  }
}