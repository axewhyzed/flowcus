import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, retry, throwError } from 'rxjs';
import { ErrorHandlingService } from '../services/error-handling.service';
import { Router } from '@angular/router';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorHandler = inject(ErrorHandlingService);
  const router = inject(Router);

  return next(req).pipe(
    retry(1), // <-- keep automatic retry
    catchError((error) => {
      if (error.status === 401 || error.status === 403) {
        console.error('Authorization error:', error);
        sessionStorage.removeItem('auth_token'); // remove token
        router.navigate(['/login']); // redirect to home page
      } else {
        // handle other errors normally
        errorHandler.handleError(error);
      }

      return throwError(() => error);
    })
  );
};