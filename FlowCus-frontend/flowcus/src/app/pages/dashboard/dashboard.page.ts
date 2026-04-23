import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../../core/services/dashboard.service'
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

interface TimetableSlot {
  id: number;
  categoryName: string;
  subtypeName: string | null;
  startTime: string;
  endTime: string;
  displayTime?: string;
  displayTitle?: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styleUrls: ['./dashboard.page.css']
})
export class DashboardPage implements OnInit {
  dashboardData: any;
  processedTimetable: TimetableSlot[] = [];
  todayDate: Date = new Date();

  constructor(private dashboardService: DashboardService, private router: Router) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  async loadDashboard() {
    try {
      this.dashboardData = await this.dashboardService.getDashboardStats();
      if (this.dashboardData?.todayTimetable) {
        this.processedTimetable = this.processTimetableData(this.dashboardData.todayTimetable);
      } else {
        this.processedTimetable = [];
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      this.dashboardData = null;
      this.processedTimetable = [];
    }
  }

  processTimetableData(timetable: any[]): TimetableSlot[] {
    return timetable.map(slot => ({
      ...slot,
      displayTitle: slot.subtypeName 
        ? `${slot.categoryName} - ${slot.subtypeName}` 
        : slot.categoryName,
      displayTime: this.formatTimeRange(slot.startTime, slot.endTime)
    })).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  formatTimeRange(startTime: string, endTime: string): string {
    return `${this.formatTime(startTime)} - ${this.formatTime(endTime)}`;
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  getCategoryColor(categoryName: string): string {
    const colors: { [key: string]: string } = {
      'Exercise': 'bg-green-50 border-green-200 text-green-700',
      'Study': 'bg-blue-50 border-blue-200 text-blue-700',
      'Work': 'bg-purple-50 border-purple-200 text-purple-700',
      'Meeting': 'bg-orange-50 border-orange-200 text-orange-700',
      'Personal': 'bg-pink-50 border-pink-200 text-pink-700',
    };
    return colors[categoryName] || 'bg-gray-50 border-gray-200 text-gray-700';
  }

  getTimeIndicator(startTime: string): string {
    const hour = parseInt(startTime.split(':')[0]);
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    if (hour < 21) return 'Evening';
    return 'Night';
  }

  quickAddTask() {
  // Navigate to tasks page and trigger the modal via query param
  this.router.navigate(['/tasks'], { queryParams: { action: 'create' } });
}
  // try to start using primeng in later versions - not now - ignore this comment
}
