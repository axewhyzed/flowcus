import { Component, OnInit } from '@angular/core';
import { TaskCategoryService } from '../../core/services/task-category.service';

@Component({
  selector: 'app-task-category',
  templateUrl: './task-category.page.html',
  styleUrls: ['./task-category.page.css']
})
export class TaskCategoryPage implements OnInit {
  categories: any[] = [];

  constructor(private taskCategoryService: TaskCategoryService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  async loadCategories() {
    this.categories = await this.taskCategoryService.getAll();
  }
}
