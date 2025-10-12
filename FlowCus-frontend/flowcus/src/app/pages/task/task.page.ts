import { Component, OnInit } from '@angular/core';
import { TaskService } from '../../core/services/task.service';
import { Task } from '../../core/models/task.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskCategory } from '../../core/models/task-category.model';
import { TaskCategoryService } from '../../core/services/task-category.service';
import { TaskSubtypeService } from '../../core/services/task-subtype.service';
import { TaskSubtype } from '../../core/models/task-subtype.model';

@Component({
  selector: 'app-task',
  templateUrl: './task.page.html',
  imports: [CommonModule, FormsModule],
  styleUrls: ['./task.page.css']
})
export class TaskPage implements OnInit {
  tasks: Task[] = [];
  newTask: Partial<Task> = {
    title: '',
    description: '',
    taskCategoryId: 0,
    taskSubtypeId: null,
    startTime: null,
    endTime: null
  };
  editingTask: Task | null = null;

  categories: TaskCategory[] = [];
  subcategories: TaskSubtype[] = [];

  constructor(
    private taskService: TaskService,
    private taskCategoryService: TaskCategoryService,
    private subtypeService: TaskSubtypeService
  ) {}

  async ngOnInit() {
    await Promise.all([
      this.loadTasks(),
      this.loadCategories(),
      this.loadSubcategories()
    ]);
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

  // Filter subcategories by selected category
  getSubcategoriesByCategory(categoryId: number | null | undefined): TaskSubtype[] {
    if (!categoryId) return [];
    return this.subcategories.filter(s => s.categoryId === categoryId);
  }

  async addTask() {
    if (!this.newTask.title?.trim() || !this.newTask.taskCategoryId) {
      alert('Please enter a title and select a category.');
      return;
    }
    await this.taskService.create(this.newTask);
    this.newTask = {
      title: '',
      description: '',
      taskCategoryId: 0,
      taskSubtypeId: null,
      startTime: null,
      endTime: null
    };
    await this.loadTasks();
  }

  editTask(task: Task) {
    this.editingTask = { ...task };
  }

  async updateTask() {
    if (!this.editingTask) return;
    await this.taskService.update(this.editingTask.taskId, this.editingTask);
    this.editingTask = null;
    await this.loadTasks();
  }

  cancelEdit() {
    this.editingTask = null;
  }

  async deleteTask(id: number) {
    if (!confirm('Delete this task?')) return;
    await this.taskService.delete(id);
    await this.loadTasks();
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
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
