import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-message.component.html',
  styleUrls: ['./error-message.component.css']
})
export class ErrorMessageComponent {
  @Input() message: string = '';
  @Input() title: string = 'Error';
  @Input() type: 'error' | 'warning' | 'info' | 'success' = 'error';
  
  @Output() dismissed = new EventEmitter<void>();

  get alertClasses(): string {
    switch (this.type) {
      case 'error': return 'bg-red-50 border border-red-200';
      case 'warning': return 'bg-yellow-50 border border-yellow-200';
      case 'info': return 'bg-blue-50 border border-blue-200';
      case 'success': return 'bg-green-50 border border-green-200';
      default: return 'bg-red-50 border border-red-200';
    }
  }

  get iconClasses(): string {
    switch (this.type) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      case 'success': return 'text-green-400';
      default: return 'text-red-400';
    }
  }

  get titleClasses(): string {
    switch (this.type) {
      case 'error': return 'text-red-800';
      case 'warning': return 'text-yellow-800';
      case 'info': return 'text-blue-800';
      case 'success': return 'text-green-800';
      default: return 'text-red-800';
    }
  }

  get messageClasses(): string {
    switch (this.type) {
      case 'error': return 'text-red-700';
      case 'warning': return 'text-yellow-700';
      case 'info': return 'text-blue-700';
      case 'success': return 'text-green-700';
      default: return 'text-red-700';
    }
  }

  get buttonClasses(): string {
    switch (this.type) {
      case 'error': return 'text-red-400 hover:bg-red-100 focus:ring-red-600 focus:ring-offset-red-50';
      case 'warning': return 'text-yellow-400 hover:bg-yellow-100 focus:ring-yellow-600 focus:ring-offset-yellow-50';
      case 'info': return 'text-blue-400 hover:bg-blue-100 focus:ring-blue-600 focus:ring-offset-blue-50';
      case 'success': return 'text-green-400 hover:bg-green-100 focus:ring-green-600 focus:ring-offset-green-50';
      default: return 'text-red-400 hover:bg-red-100 focus:ring-red-600 focus:ring-offset-red-50';
    }
  }

  onDismiss(): void {
    this.dismissed.emit();
  }
}
