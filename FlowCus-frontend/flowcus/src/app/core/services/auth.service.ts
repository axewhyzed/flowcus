import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { LoginRequest, RegisterRequest } from '../models/auth.model';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // null = initial, false = guest, true = logged in
  private isAuthenticatedSubject = new BehaviorSubject<boolean | null>(null);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private currentUser: any = null;
  private restorePromise: Promise<boolean> | null = null;

  constructor(private api: ApiService) {}

  get isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  get user() {
    return this.currentUser;
  }

  async login(data: LoginRequest) {
    // 1. Post credentials -> Server sets HttpOnly cookie
    const res = await this.api.post<any>(API_ENDPOINTS.AUTH.LOGIN, data);
    
    // 2. Validate session immediately by fetching user profile
    await this.checkAuthStatus();
    return res;
  }

  async logout() {
    try {
      await this.api.post(API_ENDPOINTS.AUTH.LOGOUT, {});
    } catch (e) {
      // Ignore errors during logout
    } finally {
      this.currentUser = null;
      this.isAuthenticatedSubject.next(false);
    }
  }

  register(data: RegisterRequest) {
    return this.api.post<any>(API_ENDPOINTS.AUTH.REGISTER, data);
  }

  me() {
    return this.api.get<any>(API_ENDPOINTS.AUTH.ME);
  }

  // Restore Session: Just call /me. 
  // If the browser has a valid cookie, this succeeds. If not, it fails.
  async checkAuthStatus(): Promise<boolean> {
    try {
      const userDto = await this.me();
      this.currentUser = userDto;
      this.isAuthenticatedSubject.next(true);
      return true;
    } catch (err) {
      this.currentUser = null;
      this.isAuthenticatedSubject.next(false);
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