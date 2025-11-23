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
      withCredentials: true, // <--- CRITICAL: Browser automatically handles Cookies
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Request Interceptor: Pass-through (Cookies are automatic)
    this.axiosInstance.interceptors.request.use((config) => {
      return config;
    });

    // Response Interceptor: Handle 401 & Refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 Unauthorized and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('auth/refresh-token')) {
          originalRequest._retry = true;

          try {
            // 1. Attempt to refresh (Browser sends Refresh Cookie, Backend sets new Access Cookie)
            await this.axiosInstance.post<AuthResponse>('auth/refresh-token');
            
            // 2. Retry the original request
            // We do NOT manually attach headers; the browser attaches the new cookie automatically.
            return this.axiosInstance(originalRequest);

          } catch (refreshError) {
            // If refresh fails (Cookie expired), redirect to login
            this.router.navigate(['/login']);
            return Promise.reject(refreshError);
          }
        }

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