import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TemplateService } from '../../../core/services/template.service';
import { TemplateList } from '../../../core/models/template.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent, ErrorMessageComponent],
  templateUrl: './template-list.component.html',
  styleUrls: ['./template-list.component.css']
})
export class TemplateListComponent implements OnInit {
  templates: TemplateList[] = [];
  isLoading = true;
  error: string | null = null;
  showCreateForm = false;
  newTemplateName = '';

  constructor(private templateService: TemplateService) {}

  async ngOnInit() {
    await this.loadTemplates();
  }

  async loadTemplates() {
    try {
      this.isLoading = true;
      const userId = localStorage.getItem("UserID") ? parseInt(localStorage.getItem("UserID")!) : 0; // TODO: Get from auth service
      this.templates = await this.templateService.getTemplatesByUser(userId);
    } catch (error) {
      this.error = 'Failed to load templates';
      console.error('Template loading error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async createTemplate() {
    if (this.newTemplateName.trim()) {
      try {
        await this.templateService.createTemplate({
          name: this.newTemplateName.trim(),
          userId: localStorage.getItem("UserID") ? parseInt(localStorage.getItem("UserID")!) : 0 // TODO: Get from auth service
        });
        this.newTemplateName = '';
        this.showCreateForm = false;
        await this.loadTemplates();
      } catch (error) {
        console.error('Error creating template:', error);
      }
    }
  }

  async deleteTemplate(template: TemplateList) {
    if (confirm(`Are you sure you want to delete "${template.templateName}"?`)) {
      try {
        await this.templateService.deleteTemplate(template.id);
        await this.loadTemplates();
      } catch (error) {
        console.error('Error deleting template:', error);
      }
    }
  }

  cancelCreate() {
    this.showCreateForm = false;
    this.newTemplateName = '';
  }
}
