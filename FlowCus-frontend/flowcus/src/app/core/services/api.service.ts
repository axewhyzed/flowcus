import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ErrorHandlingService } from './error-handling.service';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private axiosInstance: AxiosInstance;
  private csrfToken: string | null = null;
  private sessionExpiredSubject = new Subject<void>();
  readonly sessionExpired$ = this.sessionExpiredSubject.asObservable();

  constructor(
    private errorHandler: ErrorHandlingService,
    private router: Router
  ) {
    // Remove JWTs left by earlier releases; browser auth now uses the HttpOnly cookie.
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
    this.axiosInstance = axios.create({
      baseURL: environment.apiUrl,
      timeout: 30000,
      withCredentials: true, // CRITICAL: Sends 'auth_session' cookie automatically
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    this.axiosInstance.interceptors.request.use((config) => {
      const method = config.method?.toUpperCase();
      const isUnsafeMethod = method && !['GET', 'HEAD', 'OPTIONS'].includes(method);
      const isLoginRequest = (config.url || '').includes('auth/login');
      if (isLoginRequest) {
        config.headers['X-Auth-Mode'] = 'cookie';
      }
      if (isUnsafeMethod && !isLoginRequest) {
        const csrfToken = this.csrfToken || this.getCsrfCookie();
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }
      }

      // Inject client timezone offset for backend date/time alignment
      if (typeof window !== 'undefined') {
        const timezoneId = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timezoneId) {
          config.headers['X-Timezone-Id'] = timezoneId;
        }
        // Keep the offset for older servers and as a fallback for invalid/missing IANA IDs.
        config.headers['X-Timezone-Offset'] = new Date().getTimezoneOffset().toString();
      }

      return config;
    });

    // Response Interceptor: Handle 401 Session Expiry globally
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          const requestUrl = error.config?.url || '';
          if (!requestUrl.includes('auth/login')) {
            this.sessionExpiredSubject.next();
            this.router.navigate(['/login']);
          }
        }
        
        const requestUrl = error.config?.url || '';
        if (!requestUrl.includes('auth/login')) {
          this.errorHandler.handleError(error);
        }
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

  async patch<T>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.patch(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.delete(url);
    return response.data;
  }

  setCsrfToken(token: string | null | undefined): void {
    this.csrfToken = token || null;
  }

  clearSession(): void {
    this.csrfToken = null;
  }

  private getCsrfCookie(): string | null {
    if (typeof document === 'undefined') return null;

    const cookie = document.cookie
      .split('; ')
      .find(value => value.startsWith('XSRF-TOKEN='));
    if (!cookie) return null;

    try {
      return decodeURIComponent(cookie.substring('XSRF-TOKEN='.length));
    } catch {
      return cookie.substring('XSRF-TOKEN='.length);
    }
  }
}
