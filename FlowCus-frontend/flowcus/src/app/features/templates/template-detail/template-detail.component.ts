import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TemplateService } from '../../../core/services/template.service';
import { TemplateList } from '../../../core/models/template.model';
import { TemplateItem } from '../../../core/models/template-item.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-template-detail',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    LoadingSpinnerComponent, 
    ErrorMessageComponent,
    ConfirmationModalComponent
  ],
  templateUrl: './template-detail.component.html',
  styleUrls: ['./template-detail.component.css']
})
export class TemplateDetailComponent implements OnInit {
  template: TemplateList | null = null;
  templateItems: TemplateItem[] = [];
  isLoading = true;
  error: string | null = null;
  showDeleteConfirmation = false;

  templateId: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private templateService: TemplateService
  ) {
    this.templateId = parseInt(this.route.snapshot.paramMap.get('id') || '0', 10);
  }

  async ngOnInit() {
    await this.loadTemplateDetails();
  }

  async loadTemplateDetails() {
    try {
      this.isLoading = true;
      this.error = null;

      // Load template and its items
      [this.template, this.templateItems] = await Promise.all([
        this.templateService.getTemplateById(this.templateId),
        this.templateService.getTemplateItems()
      ]);

      // Filter items for this template
      this.templateItems = this.templateItems.filter(item => item.templateListId === this.templateId);
    } catch (error) {
      this.error = 'Failed to load template details';
      console.error('Template detail loading error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  editTemplate() {
    this.router.navigate(['/templates', this.templateId, 'edit']);
  }

  manageItems() {
    this.router.navigate(['/templates', this.templateId, 'items']);
  }

  deleteTemplate() {
    this.showDeleteConfirmation = true;
  }

  async confirmDelete() {
    try {
      await this.templateService.deleteTemplate(this.templateId);
      this.router.navigate(['/templates']);
    } catch (error) {
      this.error = 'Failed to delete template';
      console.error('Template deletion error:', error);
    } finally {
      this.showDeleteConfirmation = false;
    }
  }

  cancelDelete() {
    this.showDeleteConfirmation = false;
  }

  getDayName(dayNumber: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber] || 'Unknown';
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
      itemsByDay[day] = this.templateItems
        .filter(item => item.dayOfWeek === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    
    return itemsByDay;
  }

  async duplicateTemplate() {
    try {
      const newTemplate = await this.templateService.createTemplate({
        name: `${this.template?.templateName} (Copy)`,
        userId: '1' // TODO: Get from auth service
      });

      // TODO: Copy template items to new template
      this.router.navigate(['/templates', newTemplate.id]);
    } catch (error) {
      this.error = 'Failed to duplicate template';
      console.error('Template duplication error:', error);
    }
  }

  get deleteMessage(): string {
    return `Are you sure you want to delete "${this.template?.templateName}"? This will also delete all associated template items. This action cannot be undone.`;
  }
}
