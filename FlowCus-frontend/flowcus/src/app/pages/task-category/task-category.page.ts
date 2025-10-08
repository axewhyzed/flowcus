import { Component, OnInit } from '@angular/core';
import { TaskCategoryService } from '../../core/services/task-category.service';
import { TaskCategory } from '../../core/models/task-category.model';

@Component({
  selector: 'app-task-category',
  templateUrl: './task-category.page.html',
  styleUrls: ['./task-category.page.css']
})
export class TaskCategoryPage implements OnInit {
  // null = loading, [] = loaded but empty
  categories: TaskCategory[] | null = null;

  constructor(private taskCategoryService: TaskCategoryService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  async loadCategories() {
    this.categories = await this.taskCategoryService.getAll();
  }
}
