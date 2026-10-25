import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ErrorHandlingService } from './error-handling.service';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private csrfToken: string | null = null;
  private sessionExpiredSubject = new Subject<void>();
  readonly sessionExpired$ = this.sessionExpiredSubject.asObservable();

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlingService,
    private router: Router
  ) {
    // Remove JWTs left by earlier releases; browser auth now uses the HttpOnly cookie.
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private buildUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const base = environment.apiUrl.replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    return `${base}/${cleanPath}`;
  }

  private buildHeaders(method: string, path: string): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    });

    const isLoginRequest = path.includes('auth/login');
    if (isLoginRequest) {
      headers = headers.set('X-Auth-Mode', 'cookie');
    }

    const upperMethod = method.toUpperCase();
    const isUnsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(upperMethod);
    if (isUnsafeMethod && !isLoginRequest) {
      const csrf = this.csrfToken || this.getCsrfCookie();
      if (csrf) {
        headers = headers.set('X-CSRF-Token', csrf);
      }
    }

    // Inject client timezone offset for backend date/time alignment
    if (typeof window !== 'undefined') {
      const timezoneId = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezoneId) {
        headers = headers.set('X-Timezone-Id', timezoneId);
      }
      headers = headers.set('X-Timezone-Offset', new Date().getTimezoneOffset().toString());
    }

    return headers;
  }

  private buildParams(params?: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null) {
          httpParams = httpParams.set(key, String(val));
        }
      }
    }
    return httpParams;
  }

  private async request<T>(method: string, path: string, body?: any, params?: Record<string, any>): Promise<T> {
    const url = this.buildUrl(path);
    const headers = this.buildHeaders(method, path);
    const httpParams = this.buildParams(params);

    try {
      const result = await firstValueFrom(
        this.http.request<T>(method, url, {
          body,
          headers,
          params: httpParams,
          withCredentials: true,
        })
      );
      return result as T;
    } catch (err: any) {
      this.handleHttpError(err, path);
      throw err;
    }
  }

  private handleHttpError(error: any, requestUrl: string): void {
    const isLogin = requestUrl.includes('auth/login');
    const status = error instanceof HttpErrorResponse ? error.status : error?.status;

    if (status === 401 && !isLogin) {
      this.sessionExpiredSubject.next();
      this.router.navigate(['/login']);
    }

    if (!isLogin) {
      this.errorHandler.handleError(error);
    }
  }

  // --- Standard Methods ---

  get<T>(url: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>('GET', url, undefined, params);
  }

  post<T>(url: string, data?: any): Promise<T> {
    return this.request<T>('POST', url, data);
  }

  put<T>(url: string, data?: any): Promise<T> {
    return this.request<T>('PUT', url, data);
  }

  patch<T>(url: string, data?: any): Promise<T> {
    return this.request<T>('PATCH', url, data);
  }

  delete<T>(url: string): Promise<T> {
    return this.request<T>('DELETE', url);
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
