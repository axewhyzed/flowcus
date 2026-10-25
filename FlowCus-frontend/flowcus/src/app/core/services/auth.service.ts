import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { LoginRequest, LoginResponse } from '../models/auth.model';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // null = initial, false = guest, true = logged in
  private isAuthenticatedSubject = new BehaviorSubject<boolean | null>(null);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private currentUser: any = null;
  private restorePromise: Promise<boolean> | null = null;

  constructor(private api: ApiService) {
    this.api.sessionExpired$.subscribe(() => {
      this.currentUser = null;
      this.isAuthenticatedSubject.next(false);
      this.restorePromise = null;
    });
  }

  get isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  get user() {
    return this.currentUser;
  }

  async login(data: LoginRequest) {
    // Cookie mode keeps the JWT out of JavaScript-accessible storage and the response body.
    const res = await this.api.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, data);
    this.api.setCsrfToken(res.csrfToken);

    // Validate the HttpOnly cookie and retrieve a fresh CSRF token in case response fields change.
    const isSessionValid = await this.checkAuthStatus();
    if (!isSessionValid) {
      throw new Error('Login succeeded, but the session could not be restored.');
    }

    return res;
  }

  async logout() {
    let response: unknown;
    try {
      response = await this.api.post(API_ENDPOINTS.AUTH.LOGOUT, {});
    } catch (e) {
      // Ignore errors during logout
    } finally {
      this.currentUser = null;
      this.api.clearSession();
      this.isAuthenticatedSubject.next(false);
    }

    return response;
  }

  me() {
    return this.api.get<any>(API_ENDPOINTS.AUTH.ME);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return await this.api.post<{ message: string }>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      currentPassword,
      newPassword
    });
  }

  // Restore Session: Just call /me. 
  // If the browser has a valid cookie, this succeeds. If not, it fails.
  async checkAuthStatus(): Promise<boolean> {
    try {
      const userDto = await this.me();
      const csrf = await this.api.get<{ csrfToken: string }>(API_ENDPOINTS.AUTH.CSRF);
      this.api.setCsrfToken(csrf.csrfToken);
      this.currentUser = userDto;
      this.isAuthenticatedSubject.next(true);
      return true;
    } catch (err) {
      this.currentUser = null;
      this.api.clearSession();
      this.isAuthenticatedSubject.next(false);
      this.restorePromise = null;
      return false;
    }
  }

  // Called on App Init
  initRestoreIfNeeded(): Promise<boolean> {
    if (!this.restorePromise) {
      this.restorePromise = this.checkAuthStatus();
    }
    return this.restorePromise;
  }
}
