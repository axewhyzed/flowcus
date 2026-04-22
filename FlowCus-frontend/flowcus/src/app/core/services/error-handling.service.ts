import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AppError {
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlingService {
  private errorSubject = new BehaviorSubject<AppError | null>(null);
  public error$ = this.errorSubject.asObservable();

  constructor() { }

  handleError(error: any): void {
    let message: string;

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        message = 'Network error or CORS issue. Please check your connection.';
      } else {
        message = this.getErrorMessage(error);
      }
    } else {
      message = 'An unexpected client-side error occurred.';
    }

    // FIX: Use computed message instead of calling getErrorMessage again
    const appError: AppError = {
      message: message,
      code: error.code || error.status?.toString(),
      details: error,
      timestamp: new Date()
    };

    console.error('Application Error:', appError);
    this.errorSubject.next(appError);

    // Clear error after 5 seconds
    setTimeout(() => this.clearError(), 5000);
  }

  clearError(): void {
    this.errorSubject.next(null);
  }

  private getErrorMessage(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    if (error.message) {
      return error.message;
    }

    switch (error.status || error.response?.status) {
      case 400:
        return 'Bad request. Please check your input.';
      case 401:
        return 'Unauthorized. Please log in again.';
      case 403:
        return 'Access forbidden. You do not have permission.';
      case 404:
        return 'Resource not found.';
      case 500:
        return 'Internal server error. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  showSuccess(message: string): void {
    console.log('Success:', message);
  }
}
