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
  private accessToken: string | null = null; // Store Access Token in memory

  constructor(
    private errorHandler: ErrorHandlingService,
    private router: Router
  ) {
    this.axiosInstance = axios.create({
      baseURL: environment.apiUrl,
      timeout: 30000,
      withCredentials: true, // Allows sending/receiving Cookies (Refresh Token)
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // 1. Request Interceptor: Attach Access Token from Memory
    this.axiosInstance.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    // 2. Response Interceptor: Handle 401 & Refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 Unauthorized and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('auth/refresh-token')) {
          originalRequest._retry = true; // Mark as retried

          try {
            // Attempt to refresh (Browser sends Refresh Cookie)
            const refreshResponse = await this.axiosInstance.post<AuthResponse>('auth/refresh-token');
            
            // Capture the new Access Token from the response
            if (refreshResponse.data && refreshResponse.data.token) {
              this.setAccessToken(refreshResponse.data.token);
              
              // Update the Authorization header for the retry
              originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
              
              // Retry the original request
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            // If refresh failed, clear everything and redirect
            this.setAccessToken(null);
            this.router.navigate(['/login']);
            return Promise.reject(refreshError);
          }
        }

        this.errorHandler.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  // Helper to update the token in memory
  setAccessToken(token: string | null) {
    this.accessToken = token;
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