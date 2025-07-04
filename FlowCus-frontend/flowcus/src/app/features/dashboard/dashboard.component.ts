import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../core/services/task.service';
import { CreateTaskRequest, Task, TaskPriority } from '../../core/models/task.model';
import { DatePipe } from '@angular/common';
import { ErrorHandlingService } from '../../core/services/error-handling.service';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../shared/components/modal/modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  providers: [DatePipe],
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

  showDetailedView = false;
  formattedDuration: string = '';
  showAddTaskModal = false;

  newTask: CreateTaskRequest = {
    title: '',
    description: '',
    priority: TaskPriority.Normal,
    userId: '',  // set this based on your auth logic
  };


  constructor(private taskService: TaskService, private errorHandlingService: ErrorHandlingService) { }

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
      .sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime())
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

  async createTask() {
    try {
      // Set userId dynamically if needed:
      this.newTask.userId = localStorage.getItem('userId') || '';

      const createdTask = await this.taskService.createTask(this.newTask);

      this.tasks.unshift(createdTask);
      this.calculateStats();

      this.showAddTaskModal = false;

      this.newTask = {
        title: '',
        description: '',
        priority: TaskPriority.Normal,
        userId: '',
      };

    } catch (error) {
      this.errorHandlingService.handleError(error);
    }
  }

  calculateDuration() {
    const start = this.newTask.startTime ? new Date(this.newTask.startTime) : null;
    const end = this.newTask.endTime ? new Date(this.newTask.endTime) : null;

    if (start && end && end > start) {
      const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
      this.newTask.durationSeconds = durationSeconds;
      this.formattedDuration = this.formatDuration(durationSeconds);
    } else {
      this.newTask.durationSeconds = undefined;
      this.formattedDuration = '';
    }
  }

  formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (hrs > 0) parts.push(`${hrs} hr${hrs > 1 ? 's' : ''}`);
    if (mins > 0) parts.push(`${mins} min${mins > 1 ? 's' : ''}`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} sec${secs > 1 ? 's' : ''}`);

    return `${seconds} sec (${parts.join(' ')})`;
  }
}
