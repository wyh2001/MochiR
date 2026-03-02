import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStateService } from '../services/auth-state.service';

const LOGIN_ENDPOINTS = ['/api/auth/login'];

export const authRedirectInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authState = inject(AuthStateService);

  return next(req).pipe(
    catchError((error) => {
      const isLoginRequest = LOGIN_ENDPOINTS.some((ep) => req.url.includes(ep));

      if (error?.status === 401 && !isLoginRequest) {
        authState.clear();
        router.navigateByUrl('/login');
      }

      return throwError(() => error);
    }),
  );
};
