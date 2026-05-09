import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskCategoryService } from '../../core/services/task-category.service';
import { TaskSubtypeService } from '../../core/services/task-subtype.service';
import { TaskCategory } from '../../core/models/task-category.model';
import { TaskSubtype } from '../../core/models/task-subtype.model';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';

@Component({
  selector: 'app-task-types',
  templateUrl: './task-types.page.html',
  imports: [CommonModule, FormsModule]
})
export class TaskTypesPage implements OnInit {
  categories: TaskCategory[] | null = null;
  subcategories: TaskSubtype[] = [];
  selectedTab: 'categories' | 'subcategories' = 'categories';

  showSubcategoryForm = false;
  editingSubcategory: TaskSubtype | null = null;
  subcategoryForm: Partial<TaskSubtype> = {
    name: '',
    categoryId: 0
  };

  showCategoryForm = false;
  editingCategory: TaskCategory | null = null;
  categoryForm: Partial<TaskCategory> = {
    name: '',
    description: '',
    colorHex: '',
    iconName: ''
  };

  currentUser: { username: string; isAdmin: boolean } | null = null;

  constructor(
    private categoryService: TaskCategoryService,
    private subtypeService: TaskSubtypeService,
    private authService: AuthService,
    private toastService: ToastService,
    private confirmService: ConfirmService
  ) { }

  async ngOnInit() {
    try {
      this.currentUser = await this.authService.me();
    } catch {
      this.currentUser = null;
    }
    await this.loadCategoriesAndSubcategories();
  }

  selectTab(tab: 'categories' | 'subcategories') {
    this.selectedTab = tab;
  }

  async loadCategoriesAndSubcategories() {
    try {
      const [cats, subs] = await Promise.all([
        this.categoryService.getAll(),
        this.subtypeService.getAll()
      ]);
      this.categories = cats ?? [];
      this.subcategories = subs ?? [];
    } catch (error) {
      console.error('Error loading data:', error);
      this.categories = [];
      this.subcategories = [];
    }
  }

  getCategoryName(categoryId: number): string {
    const cat = this.categories?.find(c => c.id === categoryId);
    return cat ? cat.name : 'Unknown';
  }

  getCategoryColor(categoryId: number): string {
    const cat = this.categories?.find(c => c.id === categoryId);
    return cat?.colorHex || '#3B82F6';
  }

  getCategoryIcon(categoryId: number): string {
    const cat = this.categories?.find(c => c.id === categoryId);
    return cat?.iconName || 'fa-solid fa-tag';
  }

  openSubcategoryForm(subcategory?: TaskSubtype) {
    if (subcategory) {
      this.editingSubcategory = subcategory;
      this.subcategoryForm = {
        name: subcategory.name,
        categoryId: subcategory.categoryId
      };
    } else {
      this.editingSubcategory = null;
      this.subcategoryForm = {
        name: '',
        categoryId: 0
      };
    }
    this.showSubcategoryForm = true;
  }

  closeSubcategoryForm() {
    this.showSubcategoryForm = false;
    this.editingSubcategory = null;
    this.subcategoryForm = {
      name: '',
      categoryId: 0
    };
  }

  async saveSubcategory() {
    if (!this.subcategoryForm.name?.trim() || !this.subcategoryForm.categoryId) {
      this.toastService.warning('Please enter a name and select a category.');
      return;
    }

    try {
      const isEditing = !!this.editingSubcategory;
      let response: unknown;
      if (this.editingSubcategory) {
        response = await this.subtypeService.update(this.editingSubcategory.id, this.subcategoryForm);
      } else {
        response = await this.subtypeService.create(this.subcategoryForm);
      }
      await this.loadCategoriesAndSubcategories();
      this.closeSubcategoryForm();
      this.toastService.successFrom(response, isEditing ? 'Subcategory updated successfully.' : 'Subcategory created successfully.');
    } catch (error) {
      console.error('Error saving subcategory:', error);
    }
  }

  async deleteSubcategory(id: number) {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete subcategory',
      message: 'Are you sure you want to delete this subcategory? This may affect existing tasks.',
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;

    try {
      const response = await this.subtypeService.delete(id);
      await this.loadCategoriesAndSubcategories();
      this.toastService.successFrom(response, 'Subcategory deleted successfully.');
    } catch (error) {
      console.error('Error deleting subcategory:', error);
    }
  }

  getSubcategoriesByCategory(categoryId: number): TaskSubtype[] {
    return this.subcategories.filter(s => s.categoryId === categoryId);
  }

  openCategoryForm(category?: TaskCategory) {
    if (!this.currentUser?.isAdmin) return; // security check
    if (category) {
      this.editingCategory = category;
      this.categoryForm = { ...category };
    } else {
      this.editingCategory = null;
      this.categoryForm = { name: '', description: '', colorHex: '', iconName: '' };
    }
    this.showCategoryForm = true;
  }

  closeCategoryForm() {
    this.showCategoryForm = false;
    this.editingCategory = null;
    this.categoryForm = { name: '', description: '', colorHex: '', iconName: '' };
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
        response = await this.categoryService.update(this.editingCategory.id, this.categoryForm);
      } else {
        response = await this.categoryService.create(this.categoryForm);
      }
      await this.loadCategoriesAndSubcategories();
      this.closeCategoryForm();
      this.toastService.successFrom(response, isEditing ? 'Category updated successfully.' : 'Category created successfully.');
    } catch (error) {
      console.error(error);
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
      const response = await this.categoryService.delete(id);
      await this.loadCategoriesAndSubcategories();
      this.toastService.successFrom(response, 'Category deleted successfully.');
    } catch (error) {
      console.error(error);
    }
  }
}
