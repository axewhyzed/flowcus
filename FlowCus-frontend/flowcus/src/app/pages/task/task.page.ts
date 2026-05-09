import { Component, OnInit } from '@angular/core';
import { TaskService } from '../../core/services/task.service';
import { Task } from '../../core/models/task.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskCategory } from '../../core/models/task-category.model';
import { TaskCategoryService } from '../../core/services/task-category.service';
import { TaskSubtypeService } from '../../core/services/task-subtype.service';
import { TaskSubtype } from '../../core/models/task-subtype.model';
import { ActivatedRoute } from '@angular/router';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';

@Component({
  selector: 'app-task',
  templateUrl: './task.page.html',
  imports: [CommonModule, FormsModule],
  styleUrls: ['./task.page.css'],
  standalone: true
})
export class TaskPage implements OnInit {
  tasks: Task[] = [];
  newTask: Partial<Task> = {
    title: '',
    description: '',
    taskCategoryId: 0,
    taskSubtypeId: null,
    startTime: '',
    endTime: ''
  };
  editingTask: Task | null = null;
  showTaskForm = false;

  categories: TaskCategory[] = [];
  subcategories: TaskSubtype[] = [];

  searchQuery: string = '';
  selectedCategoryId: number | null = null; // 0 or null for 'All'
  sortBy: 'newest' | 'oldest' | 'priority' = 'newest';

  constructor(
    private taskService: TaskService,
    private taskCategoryService: TaskCategoryService,
    private subtypeService: TaskSubtypeService,
    private route: ActivatedRoute,
    private toastService: ToastService,
    private confirmService: ConfirmService
  ) { }

  async ngOnInit() {
    await Promise.all([
      this.loadTasks(),
      this.loadCategories(),
      this.loadSubcategories()
    ]);

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'create') {
        this.openTaskForm();
      }
    });
  }

  async loadTasks() {
    this.tasks = await this.taskService.getAll();
  }

  async loadCategories() {
    const cats = await this.taskCategoryService.getAll();
    this.categories = cats ?? [];
  }

  async loadSubcategories() {
    const subs = await this.subtypeService.getAll();
    this.subcategories = subs ?? [];
  }

  // Getters for Filtered Data
  get filteredTasks() {
    return this.tasks
      .filter(task => {
        const matchesSearch = (task.title?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          task.description?.toLowerCase().includes(this.searchQuery.toLowerCase()));
        const matchesCategory = this.selectedCategoryId ? task.taskCategoryId === this.selectedCategoryId : true;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (this.sortBy === 'priority') return (b.priority || 0) - (a.priority || 0);
        const dateA = new Date(a.createdOn || 0).getTime();
        const dateB = new Date(b.createdOn || 0).getTime();
        return this.sortBy === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }

  // Filter subcategories by selected category
  getSubcategoriesByCategory(categoryId: number | null | undefined): TaskSubtype[] {
    if (!categoryId) return [];
    return this.subcategories.filter(s => s.categoryId === Number(categoryId));
  }

  openTaskForm(task?: Task) {
    if (task) {
      this.editingTask = { ...task };
      this.newTask = {
        ...task,
        startTime: this.toDateTimeLocalValue(task.startTime),
        endTime: this.toDateTimeLocalValue(task.endTime)
      };
    } else {
      this.editingTask = null;
      this.newTask = this.getEmptyTaskForm();
    }
    this.showTaskForm = true;
  }

  closeTaskForm() {
    this.showTaskForm = false;
    this.editingTask = null;
    this.newTask = this.getEmptyTaskForm();
  }

  async saveTask() {
    // FIX: Treat 0 and other falsy values as "not selected" for required category field
    if (!this.newTask.title?.trim() || !this.newTask.taskCategoryId || this.newTask.taskCategoryId <= 0) {
      this.toastService.warning('Please enter a title and select a category.');
      return;
    }

    try {
      const isEditing = !!this.editingTask;
      let response: unknown;
      if (this.editingTask) {
        response = await this.taskService.update(this.editingTask.taskId, this.newTask);
      } else {
        response = await this.taskService.create(this.newTask);
      }
      await this.loadTasks();
      this.closeTaskForm();
      this.toastService.successFrom(response, isEditing ? 'Task updated successfully.' : 'Task created successfully.');
    } catch (error) {
      console.error('Error saving task:', error);
    }
  }

  async deleteTask(id: number) {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete task',
      message: 'Are you sure you want to delete this task?',
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;

    try {
      const response = await this.taskService.delete(id);
      await this.loadTasks();
      this.toastService.successFrom(response, 'Task deleted successfully.');
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }

  categoryNameById(id: number | null | undefined): string {
    if (!id || !this.categories?.length) return 'Uncategorized';
    const c = this.categories.find(x => x.id === id);
    return c?.name ?? 'Uncategorized';
  }

  subcategoryNameById(id: number | null | undefined): string {
    if (!id || !this.subcategories?.length) return '';
    const s = this.subcategories.find(x => x.id === id);
    return s?.name ?? '';
  }

  formatDateTime(dateTimeString: string | null | undefined): string {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private getEmptyTaskForm(): Partial<Task> {
    const now = new Date();
    return {
      title: '',
      description: '',
      taskCategoryId: 0,
      taskSubtypeId: null,
      startTime: this.toDateTimeLocalValue(now),
      endTime: this.toDateTimeLocalValue(new Date(now.getTime() + 30 * 60000))
    };
  }

  private toDateTimeLocalValue(value: string | Date | null | undefined): string {
    if (!value) return '';

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const pad = (part: number) => part.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  // Helper for template
  Object = Object;
}
