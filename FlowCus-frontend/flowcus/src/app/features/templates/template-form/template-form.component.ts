import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TemplateService } from '../../../core/services/template.service';
import { TemplateList, CreateTemplateRequest, UpdateTemplateRequest } from '../../../core/models/template.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-template-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent, ErrorMessageComponent],
  templateUrl: './template-form.component.html',
  styleUrls: ['./template-form.component.css']
})
export class TemplateFormComponent implements OnInit {
  templateForm: FormGroup;
  isLoading = false;
  isSubmitting = false;
  error: string | null = null;
  templateId: number | null = null;
  template: TemplateList | null = null;

  constructor(
    private fb: FormBuilder,
    private templateService: TemplateService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.templateForm = this.createForm();
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.templateId = parseInt(id, 10);
      await this.loadTemplate();
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]]
    });
  }

  async loadTemplate() {
    if (!this.templateId) return;

    try {
      this.isLoading = true;
      this.template = await this.templateService.getTemplateById(this.templateId);
      this.populateForm();
    } catch (error) {
      this.error = 'Failed to load template details';
      console.error('Template loading error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private populateForm() {
    if (this.template) {
      this.templateForm.patchValue({
        name: this.template.templateName,
        description: ''
      });
    }
  }

  async onSubmit() {
    if (this.templateForm.valid) {
      this.isSubmitting = true;
      this.error = null;

      try {
        const formValue = this.templateForm.value;

        if (this.isEditMode && this.templateId) {
          const updateRequest: UpdateTemplateRequest = {
            id: this.templateId,
            name: formValue.name,
            userId: localStorage.getItem("UserID") ? parseInt(localStorage.getItem("UserID")!) : 0 // TODO: Get from auth service
          };
          await this.templateService.updateTemplate(this.templateId, updateRequest);
        } else {
          const createRequest: CreateTemplateRequest = {
            name: formValue.name,
            userId: localStorage.getItem("UserID") ? parseInt(localStorage.getItem("UserID")!) : 0 // TODO: Get from auth service
          };
          await this.templateService.createTemplate(createRequest);
        }

        this.router.navigate(['/templates']);
      } catch (error) {
        this.error = 'Failed to save template. Please try again.';
        console.error('Template save error:', error);
      } finally {
        this.isSubmitting = false;
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel() {
    this.router.navigate(['/templates']);
  }

  private markFormGroupTouched() {
    Object.keys(this.templateForm.controls).forEach(key => {
      const control = this.templateForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string | null {
    const field = this.templateForm.get(fieldName);
    
    if (field && field.touched && field.errors) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['maxlength']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is too long`;
      }
    }
    
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.templateForm.get(fieldName);
    return !!(field && field.touched && field.errors);
  }

  get isEditMode(): boolean {
    return !!this.templateId;
  }

  get formTitle(): string {
    return this.isEditMode ? 'Edit Template' : 'Create New Template';
  }

  get submitButtonText(): string {
    if (this.isSubmitting) {
      return this.isEditMode ? 'Updating...' : 'Creating...';
    }
    return this.isEditMode ? 'Update Template' : 'Create Template';
  }
}
