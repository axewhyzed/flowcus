// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { LoginRequest, RegisterRequest } from '../models/auth.model';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // null = not-restored-yet, false = unauthenticated, true = authenticated
  private isAuthenticatedSubject = new BehaviorSubject<boolean | null>(null);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  // store current user in memory
  private currentUser: any = null;

  // Ensure restore called only once per page load
  private restorePromise: Promise<boolean> | null = null;

  constructor(private api: ApiService) {}

  get isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  get user() {
    return this.currentUser;
  }

  // Minimal login flow: server sets refresh cookie and returns an access token + user
  async login(data: LoginRequest) {
    const res = await this.api.post<any>(API_ENDPOINTS.AUTH.LOGIN, data);
    if (res && res.token) {
      this.api.setAccessToken(res.token); // memory-only
    }
    if (res && res.user) {
      this.currentUser = res.user;
      this.isAuthenticatedSubject.next(true);
    } else {
      this.currentUser = null;
      this.isAuthenticatedSubject.next(false);
    }
    return res;
  }

  async logout() {
    try {
      await this.api.post(API_ENDPOINTS.AUTH.LOGOUT, {});
    } catch (e) {
      // ignore server errors on logout
    } finally {
      this.api.setAccessToken(null);
      this.currentUser = null;
      this.isAuthenticatedSubject.next(false);
    }
  }

  register(data: RegisterRequest) {
    return this.api.post<any>(API_ENDPOINTS.AUTH.REGISTER, data);
  }

  // me() calls protected endpoint which relies on access token (memory) set by ApiService.
  me() {
    return this.api.get<any>(API_ENDPOINTS.AUTH.ME);
  }

  // checkAuthStatus: attempts to get /me. If 401, attempts refresh-token then retry /me.
  async checkAuthStatus(): Promise<boolean> {
    try {
      // Try directly: if access token exists in memory, this will pass.
      const user = await this.me();
      this.currentUser = user.user ?? user;
      this.isAuthenticatedSubject.next(true);
      return true;
    } catch (err: any) {
      // If first /me failed because access token missing or expired,
      // call refresh-token endpoint which will use the cookie and
      // return a new access token (see backend RefreshTokenAsync).
      try {
        const refreshResult = await this.api.post<any>('auth/refresh-token', {});
        if (refreshResult && refreshResult.token) {
          this.api.setAccessToken(refreshResult.token);
          // Retry me()
          const user = await this.me();
          this.currentUser = user;
          this.isAuthenticatedSubject.next(true);
          return true;
        }
      } catch (refreshErr) {
        // Refresh failed or me retry failed -> unauthenticated
      }

      // Clear any partial state
      this.api.setAccessToken(null);
      this.currentUser = null;
      this.isAuthenticatedSubject.next(false);
      return false;
    }
  }

  // Public method that ensures restore happens at most once per page load.
  // Guards / App init should call this and await it.
  initRestoreIfNeeded(): Promise<boolean> {
    if (!this.restorePromise) {
      this.restorePromise = this.checkAuthStatus();
    }
    return this.restorePromise;
  }
}