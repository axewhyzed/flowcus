import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (confirmService.request$ | async; as request) {
      <div class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs animate-fade-in"
        (click)="confirmService.respond(false)">
        <div class="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col"
          (click)="$event.stopPropagation()">
          
          <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full" [ngClass]="request.danger ? 'bg-red-500' : 'bg-slate-900'"></span>
            <h2 class="text-xs font-semibold text-slate-900 uppercase tracking-wider">{{ request.title }}</h2>
          </div>

          <div class="px-5 py-4">
            <p class="text-xs leading-relaxed text-slate-600">{{ request.message }}</p>
          </div>

          <div class="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
            <button
              type="button"
              class="h-8 px-3 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
              (click)="confirmService.respond(false)"
            >
              {{ request.cancelText }}
            </button>
            <button
              type="button"
              class="h-8 px-3.5 text-xs font-medium text-white rounded-md transition-colors shadow-2xs"
              [ngClass]="request.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'"
              (click)="confirmService.respond(true)"
            >
              {{ request.confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ConfirmDialogComponent {
  constructor(public confirmService: ConfirmService) {}
}
