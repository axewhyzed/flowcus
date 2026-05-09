import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastMessage, ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed right-4 top-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 pointer-events-none">
      @for (toast of toastService.toasts$ | async; track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 rounded-lg border bg-white px-4 py-3 shadow-lg"
          [ngClass]="containerClasses(toast)"
          role="status"
        >
          <i class="mt-0.5 text-sm" [ngClass]="iconClasses(toast)"></i>
          <p class="flex-1 text-sm font-medium text-gray-800">{{ toast.message }}</p>
          <button
            type="button"
            class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            (click)="toastService.dismiss(toast.id)"
            aria-label="Dismiss notification"
          >
            <i class="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>
      }
    </div>
  `
})
export class ToastContainerComponent {
  constructor(public toastService: ToastService) {}

  containerClasses(toast: ToastMessage): string {
    switch (toast.type) {
      case 'success': return 'border-emerald-200';
      case 'error': return 'border-red-200';
      case 'warning': return 'border-amber-200';
      default: return 'border-blue-200';
    }
  }

  iconClasses(toast: ToastMessage): string {
    switch (toast.type) {
      case 'success': return 'fa-solid fa-circle-check text-emerald-600';
      case 'error': return 'fa-solid fa-circle-exclamation text-red-600';
      case 'warning': return 'fa-solid fa-triangle-exclamation text-amber-600';
      default: return 'fa-solid fa-circle-info text-blue-600';
    }
  }
}
