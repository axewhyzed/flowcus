import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastMessage, ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed right-4 bottom-4 sm:right-6 sm:bottom-6 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col-reverse gap-2 pointer-events-none">
      @for (toast of toastService.toasts$ | async; track toast.id) {
        <div
          class="pointer-events-auto flex items-center gap-2.5 rounded-lg border bg-white/95 backdrop-blur-md px-3.5 py-2.5 shadow-lg shadow-slate-900/5 transition-all text-xs"
          [ngClass]="containerClasses(toast)"
          role="status"
        >
          <i class="text-xs shrink-0" [ngClass]="iconClasses(toast)"></i>
          <p class="flex-1 font-medium text-slate-800 leading-snug">{{ toast.message }}</p>
          <button
            type="button"
            class="rounded p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            (click)="toastService.dismiss(toast.id)"
            aria-label="Dismiss notification"
          >
            <i class="fa-solid fa-xmark text-[11px]"></i>
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
      case 'success': return 'border-emerald-200/80 bg-emerald-50/20';
      case 'error': return 'border-red-200/80 bg-red-50/20';
      case 'warning': return 'border-amber-200/80 bg-amber-50/20';
      default: return 'border-slate-200 bg-white';
    }
  }

  iconClasses(toast: ToastMessage): string {
    switch (toast.type) {
      case 'success': return 'fa-solid fa-circle-check text-emerald-600';
      case 'error': return 'fa-solid fa-circle-exclamation text-red-600';
      case 'warning': return 'fa-solid fa-triangle-exclamation text-amber-600';
      default: return 'fa-solid fa-circle-info text-slate-600';
    }
  }
}
