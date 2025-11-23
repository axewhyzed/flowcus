import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { LoginRequest, RegisterRequest, AuthResponse } from '../models/auth.model';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // State management for Auth
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private api: ApiService) { }

  // Getter for current value
  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  login(data: LoginRequest) {
    return this.api.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, data).then(res => {
      // Update state on successful login
      this.isAuthenticatedSubject.next(true);
      return res;
    });
  }

  refreshToken() {
    return this.api.post<AuthResponse>(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {});
  }

  register(data: RegisterRequest) {
    return this.api.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, data);
  }

  changePassword(data: any) {
    return this.api.post<any>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
  }

  logout() {
    return this.api.post<any>(API_ENDPOINTS.AUTH.LOGOUT, {}).then(res => {
      this.isAuthenticatedSubject.next(false);
      return res;
    });
  }

  me() {
    return this.api.get<any>(API_ENDPOINTS.AUTH.ME);
  }

  // Method used by AuthGuard to verify cookie validity
  async checkAuthStatus(): Promise<boolean> {
    try {
      await this.me();
      this.isAuthenticatedSubject.next(true);
      return true;
    } catch (error) {
      this.isAuthenticatedSubject.next(false);
      return false;
    }
  }
}