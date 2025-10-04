import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../../core/services/dashboard.service'
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  imports: [CommonModule],
  styleUrls: ['./dashboard.page.css']
})
export class DashboardPage implements OnInit {
  dashboardData: any;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  async loadDashboard() {
    this.dashboardData = await this.dashboardService.getDashboardData();
  }
}
