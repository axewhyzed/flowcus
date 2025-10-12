import { Component, OnInit } from '@angular/core';
import { TaskCategoryService } from '../../core/services/task-category.service';
import { TaskSubtypeService } from '../../core/services/task-subtype.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-task-types',
    templateUrl: './task-types.page.html',
    imports: [FormsModule]
})
export class TaskTypesPage implements OnInit {
    categories: any[] | null = null;
    subcategories: any[] = [];
    selectedTab: 'categories' | 'subcategories' = 'categories';

    // Crud state for subcategories
    newSubcategoryName: Record<number, string> = {};
    editSubcategoryId: number | null = null;
    editSubcategoryName = '';

    editSubcategoryCategoryId: number | null = null;
    newSubcategoryCategoryId: number | null = null;

    constructor(
        private categoryService: TaskCategoryService,
        private subtypeService: TaskSubtypeService
    ) { }

    ngOnInit() {
        this.loadCategoriesAndSubcategories();
    }

    selectTab(tab: 'categories' | 'subcategories') {
        this.selectedTab = tab;
    }

    async loadCategoriesAndSubcategories() {
        const [cats, subs] = await Promise.all([
            this.categoryService.getAll(),
            this.subtypeService.getAll()
        ]);
        this.categories = cats ?? [];
        this.subcategories = subs ?? [];
    }

    groupedSubcategories() {
        const groups: { categoryId: number; subs: any[] }[] = [];
        if (!this.subcategories.length || !this.categories) return groups;
        for (const cat of this.categories) {
            groups.push({
                categoryId: cat.id,
                subs: this.subcategories.filter(s => s.categoryId === cat.id)
            });
        }
        return groups;
    }

    getCategoryName(categoryId: number): string {
        const cat = this.categories?.find(c => c.id === categoryId);
        return cat ? cat.name : '';
    }

    // Add new subcategory under categoryId
    async addSubcategory(categoryId: number) {
        const name = (this.newSubcategoryName[categoryId] || '').trim();
        if (!name) return;
        const created = await this.subtypeService.create({ name, categoryId });
        this.subcategories.push(created);
        this.newSubcategoryName[categoryId] = '';
    }

    // Edit
    startEditSubcategory(sub: any) {
        this.editSubcategoryId = sub.id;
        this.editSubcategoryName = sub.name;
        this.editSubcategoryCategoryId = sub.categoryId;
    }

    // Cancel edit
    cancelEdit() {
        this.editSubcategoryId = null;
        this.editSubcategoryName = '';
        this.editSubcategoryCategoryId = null;
    }

    // Save edited subcategory name
    async saveSubcategory(sub: any) {
        const name = this.editSubcategoryName.trim();
        const categoryId = this.editSubcategoryCategoryId;
        if (!name || !categoryId) return;

        const updated = await this.subtypeService.update(sub.id, { name, categoryId });

        const index = this.subcategories.findIndex(s => s.id === sub.id);
        if (index >= 0) {
            this.subcategories[index] = { ...this.subcategories[index], name: updated.name, categoryId };
        }

        this.cancelEdit();
    }

    // Delete subcategory
    async deleteSubcategory(sub: any) {
        await this.subtypeService.delete(sub.id);
        this.subcategories = this.subcategories.filter(s => s.id !== sub.id);
    }

    getSubcategoriesByCategory(categoryId: number) {
        return this.subcategories?.filter(s => s.categoryId === categoryId) ?? [];
    }

    hasNoSubcategories(categoryId: number): boolean {
        return this.getSubcategoriesByCategory(categoryId).length === 0;
    }
}
