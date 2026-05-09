import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (confirmService.request$ | async; as request) {
      <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
        <div class="w-full max-w-md rounded-lg bg-white shadow-xl" (click)="$event.stopPropagation()">
          <div class="border-b border-gray-200 px-6 py-4">
            <h2 class="text-lg font-semibold text-gray-900">{{ request.title }}</h2>
          </div>
          <div class="px-6 py-5">
            <p class="text-sm leading-6 text-gray-600">{{ request.message }}</p>
          </div>
          <div class="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              (click)="confirmService.respond(false)"
            >
              {{ request.cancelText }}
            </button>
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm"
              [ngClass]="request.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-700 hover:bg-blue-800'"
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
