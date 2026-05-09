import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlingService {
  constructor(private toastService: ToastService) { }

  handleError(error: any): void {
    let message: string;
    let statusCode: number | undefined;

    // Check if it's an Axios error
    if (error.response) {
      // Axios error
      statusCode = error.response.status;
      message = error.response.data?.error ||
        error.response.data?.message ||
        this.getErrorMessageForStatus(statusCode);
    }
    // Check if it's an HttpErrorResponse (Angular HttpClient)
    else if (error instanceof HttpErrorResponse) {
      statusCode = error.status;
      message = error.error?.error ||
        error.error?.message ||
        this.getErrorMessageForStatus(statusCode);
    }
    // Network error
    else if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      message = 'Network error. Please check your connection.';
    }
    // Fallback
    else {
      message = error.message || 'An unexpected error occurred.';
    }

    console.error('Application Error:', error);
    this.toastService.error(message);
  }

  showSuccess(message: string): void {
    this.toastService.success(message);
  }

  private getErrorMessageForStatus(status: number | undefined): string {
    switch (status) {
      case 400: return 'Bad request. Please check your input.';
      case 401: return 'Unauthorized. Please log in again.';
      case 403: return 'Access forbidden. You do not have permission.';
      case 404: return 'Resource not found.';
      case 429: return 'Too many requests. Please try again later.';
      case 500: return 'Internal server error. Please try again later.';
      default: return 'An unexpected error occurred.';
    }
  }
}
