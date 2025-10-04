import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TemplateService } from '../../../core/services/template.service';
import { TemplateList } from '../../../core/models/template.model';
import { TemplateItem, CreateTemplateItemRequest, DayOfWeek, BatchCreateTemplateItemsRequest } from '../../../core/models/timetable-item.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-template-item-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent, ErrorMessageComponent, RouterModule],
  templateUrl: './template-item-form.component.html',
  styleUrls: ['./template-item-form.component.css']
})
export class TemplateItemFormComponent implements OnInit {
  templateItemForm: FormGroup;
  template: TemplateList | null = null;
  existingItems: TemplateItem[] = [];
  isLoading = false;
  isSubmitting = false;
  error: string | null = null;
  templateId: number;

  DayOfWeek = DayOfWeek;
  
  days = [
    { value: DayOfWeek.Sunday, label: 'Sunday' },
    { value: DayOfWeek.Monday, label: 'Monday' },
    { value: DayOfWeek.Tuesday, label: 'Tuesday' },
    { value: DayOfWeek.Wednesday, label: 'Wednesday' },
    { value: DayOfWeek.Thursday, label: 'Thursday' },
    { value: DayOfWeek.Friday, label: 'Friday' },
    { value: DayOfWeek.Saturday, label: 'Saturday' }
  ];

  constructor(
    private fb: FormBuilder,
    private templateService: TemplateService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.templateId = parseInt(this.route.snapshot.paramMap.get('id') || '0', 10);
    this.templateItemForm = this.createForm();
  }

  async ngOnInit() {
    await this.loadTemplateAndItems();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      items: this.fb.array([this.createItemGroup()])
    });
  }

  private createItemGroup(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(500)]],
      dayOfWeek: [DayOfWeek.Monday, [Validators.required]],
      startTime: ['09:00', [Validators.required]],
      endTime: ['10:00', [Validators.required]]
    });
  }

  get itemsFormArray(): FormArray {
    return this.templateItemForm.get('items') as FormArray;
  }

  async loadTemplateAndItems() {
    try {
      this.isLoading = true;
      this.error = null;

      // Load template details and existing items
      [this.template, this.existingItems] = await Promise.all([
        this.templateService.getTemplateById(this.templateId),
        this.templateService.getTemplateItems()
      ]);

      // Filter items for this template
      this.existingItems = this.existingItems.filter(item => item.templateListId === this.templateId);
    } catch (error) {
      this.error = 'Failed to load template details';
      console.error('Template item loading error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  addItem() {
    this.itemsFormArray.push(this.createItemGroup());
  }

  removeItem(index: number) {
    if (this.itemsFormArray.length > 1) {
      this.itemsFormArray.removeAt(index);
    }
  }

  async onSubmit() {
    if (this.templateItemForm.valid) {
      this.isSubmitting = true;
      this.error = null;

      try {
        const formItems = this.itemsFormArray.value;
        const templateItems: CreateTemplateItemRequest[] = formItems.map((item: any) => ({
          templateListId: this.templateId,
          title: item.title,
          description: item.description,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          userId: localStorage.getItem("UserID") ? parseInt(localStorage.getItem("UserID")!) : 0 // TODO: Get from auth service
        }));

        const batchRequest: BatchCreateTemplateItemsRequest = {
          templateItems
        };

        await this.templateService.createTemplateItemsBatch(batchRequest);
        this.router.navigate(['/templates', this.templateId]);
      } catch (error) {
        this.error = 'Failed to save template items. Please try again.';
        console.error('Template items save error:', error);
      } finally {
        this.isSubmitting = false;
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel() {
    this.router.navigate(['/templates', this.templateId]);
  }

  private markFormGroupTouched() {
    this.templateItemForm.markAllAsTouched();
  }

  async deleteExistingItem(item: TemplateItem) {
    if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
      try {
        await this.templateService.deleteTemplateItem(item.id);
        await this.loadTemplateAndItems();
      } catch (error) {
        this.error = 'Failed to delete template item';
        console.error('Template item deletion error:', error);
      }
    }
  }

  getDayName(dayOfWeek: number): string {
    const day = this.days.find(d => d.value === dayOfWeek);
    return day ? day.label : 'Unknown';
  }

  formatTime(timeString: string): string {
    try {
      const [hours, minutes] = timeString.split(':');
      const time = new Date();
      time.setHours(parseInt(hours), parseInt(minutes));
      return time.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return timeString;
    }
  }

  getItemsByDay() {
    const itemsByDay: { [key: number]: TemplateItem[] } = {};
    
    for (let day = 0; day < 7; day++) {
      itemsByDay[day] = this.existingItems
        .filter(item => item.dayOfWeek === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    
    return itemsByDay;
  }
}
