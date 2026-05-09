import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskCategoryService } from '../../core/services/task-category.service';
import { TaskCategory } from '../../core/models/task-category.model';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';

@Component({
  selector: 'app-task-category',
  templateUrl: './task-category.page.html',
  imports: [CommonModule, FormsModule],
  styleUrls: ['./task-category.page.css'],
  standalone: true
})
export class TaskCategoryPage implements OnInit {
  categories: TaskCategory[] | null = null;
  showCategoryForm = false;
  editingCategory: TaskCategory | null = null;
  categoryForm: Partial<TaskCategory> = {
    name: '',
    description: '',
    colorHex: '#3B82F6',
    iconName: 'fa-solid fa-tag'
  };

  // Common icon options
  commonIcons = [
    { name: 'fa-solid fa-tag', label: 'Tag' },
    { name: 'fa-solid fa-briefcase', label: 'Work' },
    { name: 'fa-solid fa-home', label: 'Home' },
    { name: 'fa-solid fa-dumbbell', label: 'Fitness' },
    { name: 'fa-solid fa-book', label: 'Study' },
    { name: 'fa-solid fa-utensils', label: 'Food' },
    { name: 'fa-solid fa-heart', label: 'Health' },
    { name: 'fa-solid fa-gamepad', label: 'Entertainment' },
    { name: 'fa-solid fa-shopping-cart', label: 'Shopping' },
    { name: 'fa-solid fa-car', label: 'Transport' },
    { name: 'fa-solid fa-phone', label: 'Communication' },
    { name: 'fa-solid fa-calendar', label: 'Event' }
  ];

  constructor(
    private taskCategoryService: TaskCategoryService,
    private toastService: ToastService,
    private confirmService: ConfirmService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  async loadCategories() {
    try {
      this.categories = await this.taskCategoryService.getAll();
    } catch (error) {
      console.error('Error loading categories:', error);
      this.categories = [];
    }
  }

  openCategoryForm(category?: TaskCategory) {
    if (category) {
      this.editingCategory = category;
      this.categoryForm = {
        name: category.name,
        description: category.description || '',
        colorHex: category.colorHex || '#3B82F6',
        iconName: category.iconName || 'fa-solid fa-tag'
      };
    } else {
      this.editingCategory = null;
      this.categoryForm = {
        name: '',
        description: '',
        colorHex: '#3B82F6',
        iconName: 'fa-solid fa-tag'
      };
    }
    this.showCategoryForm = true;
  }

  closeCategoryForm() {
    this.showCategoryForm = false;
    this.editingCategory = null;
    this.categoryForm = {
      name: '',
      description: '',
      colorHex: '#3B82F6',
      iconName: 'fa-solid fa-tag'
    };
  }

  async saveCategory() {
    if (!this.categoryForm.name?.trim()) {
      this.toastService.warning('Please enter a category name.');
      return;
    }

    try {
      const isEditing = !!this.editingCategory;
      let response: unknown;
      if (this.editingCategory) {
        response = await this.taskCategoryService.update(this.editingCategory.id, this.categoryForm);
      } else {
        response = await this.taskCategoryService.create(this.categoryForm);
      }
      await this.loadCategories();
      this.closeCategoryForm();
      this.toastService.successFrom(response, isEditing ? 'Category updated successfully.' : 'Category created successfully.');
    } catch (error) {
      console.error('Error saving category:', error);
    }
  }

  async deleteCategory(id: number) {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete category',
      message: 'Are you sure you want to delete this category? This may affect existing tasks.',
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;
    
    try {
      const response = await this.taskCategoryService.delete(id);
      await this.loadCategories();
      this.toastService.successFrom(response, 'Category deleted successfully.');
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  }
}
