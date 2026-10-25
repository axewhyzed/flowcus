import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { DashboardCurrentFocus, DashboardStats } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private apiService: ApiService) {}

  async getDashboardStats(): Promise<DashboardStats> {
    return await this.apiService.get<DashboardStats>(API_ENDPOINTS.DASHBOARD.STATS);
  }

  async getCurrentFocus(): Promise<DashboardCurrentFocus | null> {
    return await this.apiService.get<DashboardCurrentFocus | null>(API_ENDPOINTS.DASHBOARD.NOW);
  }
}
