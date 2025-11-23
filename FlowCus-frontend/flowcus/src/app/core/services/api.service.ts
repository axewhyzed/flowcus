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

  constructor(
    private errorHandler: ErrorHandlingService,
    private router: Router
  ) {
    this.axiosInstance = axios.create({
      baseURL: environment.apiUrl,
      timeout: 30000,
      withCredentials: true, // <--- CRITICAL: Allows sending Cookies (Refresh Token)
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // 1. Request Interceptor: Attach Access Token
    this.axiosInstance.interceptors.request.use((config) => {
      const token = sessionStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // 2. Response Interceptor: Handle 401 & Refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 Unauthorized and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true; // Mark as retried to prevent infinite loops

          try {
            // Attempt to refresh the token
            // Note: We use the internal instance to call the backend
            const refreshResponse = await this.axiosInstance.post<AuthResponse>('auth/refresh-token');
            
            // If success, get new token
            const newToken = refreshResponse.data.token;
            sessionStorage.setItem('auth_token', newToken);

            // Update Authorization header for the retry
            originalRequest.headers.Authorization = `Bearer ${newToken}`;

            // Retry the original request
            return this.axiosInstance(originalRequest);

          } catch (refreshError) {
            // If refresh failed (Cookie expired or invalid), logout user
            sessionStorage.removeItem('auth_token');
            this.router.navigate(['/login']);
            return Promise.reject(refreshError);
          }
        }

        // For all other errors (or if refresh failed), show error message
        this.errorHandler.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.get(url);
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