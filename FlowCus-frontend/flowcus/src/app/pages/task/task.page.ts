import { Component, OnInit } from '@angular/core';
import { TaskService } from '../../core/services/task.service';
import { Task } from '../../core/models/task.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskCategory } from '../../core/models/task-category.model';
import { TaskCategoryService } from '../../core/services/task-category.service';

@Component({
  selector: 'app-task',
  templateUrl: './task.page.html',
  imports: [CommonModule, FormsModule],
  styleUrls: ['./task.page.css']
})
export class TaskPage implements OnInit {
  tasks: Task[] = [];
  newTask: Partial<Task & { taskCategoryId: number }> = { title: '', description: '', taskCategoryId: 0 };
  editingTask: Task | null = null;

  categories: TaskCategory[] | null = null;

  constructor(private taskService: TaskService, private taskCategoryService: TaskCategoryService) { }

  async ngOnInit() {
    await Promise.all([this.loadTasks(), this.loadCategories()]);
  }

  async loadTasks() {
    this.tasks = await this.taskService.getAll();
  }

  async loadCategories() {
    this.categories = await this.taskCategoryService.getAll();
    if (!this.categories) this.categories = [];
  }

  async addTask() {
    if (!this.newTask.title?.trim() || !this.newTask.taskCategoryId) {
      alert('Please enter a title and select a category.');
      return;
    }
    await this.taskService.create(this.newTask);
    this.newTask = { title: '', description: '', taskCategoryId: undefined };
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
}
