import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { environment } from '../../../environments/environment';
import { ErrorHandlingService } from './error-handling.service';

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
      withCredentials: true, // CRITICAL: Sends 'auth_session' cookie automatically
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Response Interceptor: Handle 401 Session Expiry globally
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
            // Session cookie expired or invalid -> force login
            this.router.navigate(['/login']);
        }
        
        this.errorHandler.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  // --- Standard Methods ---

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