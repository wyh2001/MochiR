import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStateService } from '../services/auth-state.service';

export const SKIP_AUTH_REDIRECT = new HttpContextToken<boolean>(() => false);

export const authRedirectInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authState = inject(AuthStateService);

  return next(req).pipe(
    catchError((error) => {
      if (error?.status === 401 && !req.context.get(SKIP_AUTH_REDIRECT)) {
        authState.clear();
        router.navigateByUrl('/login');
      }

      return throwError(() => error);
    }),
  );
};
