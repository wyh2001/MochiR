import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((error) => {
      const status = error instanceof HttpErrorResponse ? error.status : (error?.status ?? 0);

      // 401 is handled by authRedirectInterceptor
      if (status !== 401) {
        const message = extractMessage(error);
        notifications.show('danger', message);
      }

      return throwError(() => error);
    }),
  );
};

function extractMessage(error: unknown): string {
  // Structured API error thrown by apiResponseInterceptor
  if (error !== null && typeof error === 'object' && 'code' in error && 'message' in error) {
    return (error as { message: string }).message;
  }

  // HttpErrorResponse with a JSON body that has a message
  if (error instanceof HttpErrorResponse) {
    if (typeof error.error === 'string' && error.error.length > 0) {
      return error.error;
    }
    if (error.error?.message) {
      return error.error.message;
    }
  }

  return 'Something went wrong. Please try again.';
}
