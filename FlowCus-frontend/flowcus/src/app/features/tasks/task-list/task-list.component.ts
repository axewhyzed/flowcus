import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../core/services/task.service';
import { Task, TaskPriority } from '../../../core/models/task.model';
import { TaskCardComponent } from '../task-card/task-card.component';
import { TaskFormComponent } from '../task-form/task-form.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    TaskCardComponent, 
    TaskFormComponent,
    LoadingSpinnerComponent,
    ErrorMessageComponent,
    ConfirmationModalComponent
  ],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit {
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  isLoading = true;
  error: string | null = null;
  
  // Form state
  showCreateForm = false;
  editingTask: Task | null = null;
  
  // Delete confirmation
  showDeleteConfirmation = false;
  taskToDelete: Task | null = null;
  
  // Filters
  searchTerm = '';
  selectedPriority: TaskPriority | '' = '';
  selectedStatus: 'all' | 'completed' | 'pending' = 'all';

  TaskPriority = TaskPriority;

  constructor(private taskService: TaskService) {}

  async ngOnInit() {
    await this.loadTasks();
  }

  async loadTasks() {
    try {
      this.isLoading = true;
      this.tasks = await this.taskService.getAllTasks();
      this.applyFilters();
    } catch (error) {
      this.error = 'Failed to load tasks';
      console.error('Task loading error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters() {
    this.filteredTasks = this.tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           task.description.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesPriority = this.selectedPriority === '' || task.priority === this.selectedPriority;
      
      const matchesStatus = this.selectedStatus === 'all' || 
                           (this.selectedStatus === 'completed' && task.isCompleted) ||
                           (this.selectedStatus === 'pending' && !task.isCompleted);

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }

  trackByTaskId(index: number, task: Task): number {
    return task.taskId;
  }

  editTask(task: Task) {
    this.editingTask = task;
  }

  async toggleTaskCompletion(task: Task) {
    try {
      await this.taskService.toggleTaskCompletion(task.taskId, !task.isCompleted);
      await this.loadTasks();
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  }

  deleteTask(task: Task) {
    this.taskToDelete = task;
    this.showDeleteConfirmation = true;
  }

  async confirmDelete() {
    if (this.taskToDelete) {
      try {
        await this.taskService.deleteTask(this.taskToDelete.taskId);
        await this.loadTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      } finally {
        this.taskToDelete = null;
        this.showDeleteConfirmation = false;
      }
    }
  }

  cancelDelete() {
    this.taskToDelete = null;
    this.showDeleteConfirmation = false;
  }

  async onTaskSaved(task: Task) {
    this.showCreateForm = false;
    this.editingTask = null;
    await this.loadTasks();
  }

  onFormCancelled() {
    this.showCreateForm = false;
    this.editingTask = null;
  }

  get deleteMessage(): string {
  return this.taskToDelete
    ? `Are you sure you want to delete "${this.taskToDelete.title}"? This action cannot be undone.`
    : '';
}
}
