import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '../constants/api-endpoints';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private apiService: ApiService) {}

  async getDashboardStats(): Promise<any> {
    return await this.apiService.get(API_ENDPOINTS.DASHBOARD.STATS);
  }

  async getCurrentFocus(): Promise<any> {
    return await this.apiService.get(API_ENDPOINTS.DASHBOARD.NOW);
  }
}