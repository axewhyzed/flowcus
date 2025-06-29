import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../core/services/task.service';
import { Task, TaskPriority } from '../../core/models/task.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  tasks: Task[] = [];
  stats = {
    total: 0,
    completed: 0,
    pending: 0,
    highPriority: 0
  };
  isLoading = true;
  error: string | null = null;

  constructor(private taskService: TaskService) {}

  async ngOnInit() {
    await this.loadDashboardData();
  }

  async loadDashboardData() {
    try {
      this.isLoading = true;
      this.tasks = await this.taskService.getAllTasks();
      this.calculateStats();
    } catch (error) {
      this.error = 'Failed to load dashboard data';
      console.error('Dashboard error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private calculateStats() {
    this.stats.total = this.tasks.length;
    this.stats.completed = this.tasks.filter(task => task.isCompleted).length;
    this.stats.pending = this.tasks.filter(task => !task.isCompleted).length;
    this.stats.highPriority = this.tasks.filter(task => task.priority === TaskPriority.High).length;
  }

  get recentTasks(): Task[] {
    return this.tasks
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }

  getPriorityText(priority: TaskPriority): string {
    switch (priority) {
      case TaskPriority.High: return 'High';
      case TaskPriority.Normal: return 'Normal';
      case TaskPriority.Low: return 'Low';
      default: return 'Unknown';
    }
  }

  getPriorityClass(priority: TaskPriority): string {
    switch (priority) {
      case TaskPriority.High: return 'bg-red-100 text-red-800';
      case TaskPriority.Normal: return 'bg-yellow-100 text-yellow-800';
      case TaskPriority.Low: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
