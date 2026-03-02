import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { NotFound } from './pages/not-found/not-found';
import { AccessDenied } from './pages/access-denied/access-denied';
import { guestGuard } from './core/guards/guest.guard';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', component: Home },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    children: [
      {
        path: 'subject-types',
        loadComponent: () =>
          import('./pages/admin/subject-types/subject-type-list/subject-type-list').then(
            (m) => m.SubjectTypeList,
          ),
      },
      {
        path: 'subject-types/new',
        loadComponent: () =>
          import('./pages/admin/subject-types/subject-type-form/subject-type-form').then(
            (m) => m.SubjectTypeForm,
          ),
      },
      {
        path: 'subject-types/:id/edit',
        loadComponent: () =>
          import('./pages/admin/subject-types/subject-type-form/subject-type-form').then(
            (m) => m.SubjectTypeForm,
          ),
      },
    ],
  },
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
