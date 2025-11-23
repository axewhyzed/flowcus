import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { LoginRequest, RegisterRequest, AuthResponse } from '../models/auth.model';
import { API_ENDPOINTS } from '../constants/api-endpoints';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private api: ApiService) {}

  login(data: LoginRequest) {
    return this.api.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, data);
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
    return this.api.post<any>(API_ENDPOINTS.AUTH.LOGOUT, {});
  }

  me() {
    return this.api.get<any>(API_ENDPOINTS.AUTH.ME);
  }
}