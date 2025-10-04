import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, retry, throwError } from 'rxjs';
import { ErrorHandlingService } from '../services/error-handling.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorHandler = inject(ErrorHandlingService);

  return next(req).pipe(
    retry(1), // <-- keep automatic retry
    catchError((error) => {
      errorHandler.handleError(error);
      return throwError(() => error);
    })
  );
};