import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-modal',
  imports: [CommonModule],
  template: `
    <div 
      class="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-gray-900/30"
      (click)="onOverlayClick($event)"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-lg" (click)="$event.stopPropagation()">
        <ng-content></ng-content>
      </div>
    </div>
  `
})
export class ModalComponent {
  @Input() closeOnOverlay = true;
  @Output() closed = new EventEmitter<void>();

  onOverlayClick(event: MouseEvent) {
    if (this.closeOnOverlay) {
      this.closed.emit();
    }
  }
}
