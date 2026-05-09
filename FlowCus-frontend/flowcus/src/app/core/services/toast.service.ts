import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  success(message: string): void {
    this.show('success', message);
  }

  successFrom(response: unknown, fallback: string): void {
    this.success(this.messageFrom(response) ?? fallback);
  }

  error(message: string): void {
    this.show('error', message);
  }

  warning(message: string): void {
    this.show('warning', message);
  }

  info(message: string): void {
    this.show('info', message);
  }

  dismiss(id: number): void {
    this.toastsSubject.next(this.toastsSubject.value.filter(t => t.id !== id));
  }

  private show(type: ToastType, message: string): void {
    const toast = { id: this.nextId++, type, message };
    this.toastsSubject.next([...this.toastsSubject.value, toast]);
    setTimeout(() => this.dismiss(toast.id), 4000);
  }

  private messageFrom(response: unknown): string | null {
    if (response && typeof response === 'object' && 'message' in response) {
      const message = (response as { message?: unknown }).message;
      return typeof message === 'string' && message.trim() ? message : null;
    }

    return null;
  }
}
