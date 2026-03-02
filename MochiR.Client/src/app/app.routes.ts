import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { NotFound } from './pages/not-found/not-found';
import { AccessDenied } from './pages/access-denied/access-denied';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  { path: '', component: Home },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'password-reset',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/auth/password-reset/password-reset').then((m) => m.PasswordReset),
  },
  {
    path: 'password-reset/confirm',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/auth/password-reset-confirm/password-reset-confirm').then(
        (m) => m.PasswordResetConfirm,
      ),
  },
  { path: 'access-denied', component: AccessDenied },
  { path: '**', component: NotFound },
];
