import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
  resolve: (confirmed: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private requestSubject = new BehaviorSubject<ConfirmRequest | null>(null);
  request$ = this.requestSubject.asObservable();

  confirm(options: Partial<Omit<ConfirmRequest, 'resolve'>> & { message: string }): Promise<boolean> {
    return new Promise(resolve => {
      this.requestSubject.next({
        title: options.title ?? 'Confirm action',
        message: options.message,
        confirmText: options.confirmText ?? 'Confirm',
        cancelText: options.cancelText ?? 'Cancel',
        danger: options.danger ?? false,
        resolve
      });
    });
  }

  respond(confirmed: boolean): void {
    const request = this.requestSubject.value;
    if (!request) return;

    this.requestSubject.next(null);
    request.resolve(confirmed);
  }
}
