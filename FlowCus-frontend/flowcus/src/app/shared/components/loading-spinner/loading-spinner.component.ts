import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex justify-center items-center" [class]="containerClass">
      <div class="animate-spin rounded-full border-b-2 border-blue-600" [class]="spinnerClass">
      </div>
      <span *ngIf="message" class="ml-3 text-gray-600">{{ message }}</span>
    </div>
  `
})
export class LoadingSpinnerComponent {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() message: string = '';
  @Input() containerClass: string = 'py-8';

  get spinnerClass(): string {
    switch (this.size) {
      case 'sm': return 'h-6 w-6';
      case 'lg': return 'h-16 w-16';
      default: return 'h-12 w-12';
    }
  }
}
