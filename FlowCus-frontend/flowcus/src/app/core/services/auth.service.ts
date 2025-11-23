import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { LoginRequest, RegisterRequest, AuthResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private api: ApiService) {}

  login(data: LoginRequest) {
    return this.api.post<AuthResponse>('auth/login', data);
  }

  // NEW: Called by interceptor when 401 happens
  refreshToken() {
    return this.api.post<AuthResponse>('auth/refresh-token', {});
  }

  register(data: RegisterRequest) {
    return this.api.post<AuthResponse>('auth/register', data);
  }

  changePassword(data: any) {
    return this.api.post<any>('auth/change-password', data);
  }

  logout() {
    sessionStorage.removeItem('auth_token'); // Ensure cleanup on explicit logout
    return this.api.post<any>('auth/logout', {});
  }

  me() {
    return this.api.get<any>('auth/me');
  }
}