import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  constructor(private apiService: ApiService) {}

  async getDashboardData(): Promise<any> {
    return await this.apiService.get('/dashboard');
  }
}
