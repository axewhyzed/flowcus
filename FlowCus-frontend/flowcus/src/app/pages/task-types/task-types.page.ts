import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskCategoryService } from '../../core/services/task-category.service';
import { TaskSubtypeService } from '../../core/services/task-subtype.service';
import { TaskCategory } from '../../core/models/task-category.model';
import { TaskSubtype } from '../../core/models/task-subtype.model';
import { AuthService } from '../../core/services/auth.service';

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
    private authService: AuthService
  ) { }

  async ngOnInit() {
    try {
      this.currentUser = await this.authService.me();
    } catch {
      this.currentUser = null;
    }
    this.loadCategoriesAndSubcategories();
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
      alert('Please enter a name and select a category.');
      return;
    }

    try {
      if (this.editingSubcategory) {
        await this.subtypeService.update(this.editingSubcategory.id, this.subcategoryForm);
      } else {
        await this.subtypeService.create(this.subcategoryForm);
      }
      await this.loadCategoriesAndSubcategories();
      this.closeSubcategoryForm();
    } catch (error) {
      console.error('Error saving subcategory:', error);
      alert('Failed to save subcategory. Please try again.');
    }
  }

  async deleteSubcategory(id: number) {
    if (!confirm('Are you sure you want to delete this subcategory? This may affect existing tasks.')) return;

    try {
      await this.subtypeService.delete(id);
      await this.loadCategoriesAndSubcategories();
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      alert('Failed to delete subcategory. Please try again.');
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
      alert('Please enter a category name.');
      return;
    }
    try {
      if (this.editingCategory) {
        await this.categoryService.update(this.editingCategory.id, this.categoryForm);
      } else {
        await this.categoryService.create(this.categoryForm);
      }
      await this.loadCategoriesAndSubcategories();
      this.closeCategoryForm();
    } catch (error) {
      console.error(error);
      alert('Failed to save category. Please try again.');
    }
  }

  async deleteCategory(id: number) {
    if (!confirm('Are you sure you want to delete this category? This may affect existing tasks.')) return;
    try {
      await this.categoryService.delete(id);
      await this.loadCategoriesAndSubcategories();
    } catch (error) {
      console.error(error);
      alert('Failed to delete category. Please try again.');
    }
  }
}
