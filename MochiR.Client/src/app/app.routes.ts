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
      {
        path: 'criteria-templates',
        loadComponent: () =>
          import('./pages/admin/criteria-templates/criteria-template-list/criteria-template-list').then(
            (m) => m.CriteriaTemplateList,
          ),
      },
      {
        path: 'criteria-templates/new',
        loadComponent: () =>
          import('./pages/admin/criteria-templates/criteria-template-form/criteria-template-form').then(
            (m) => m.CriteriaTemplateForm,
          ),
      },
      {
        path: 'criteria-templates/:id',
        loadComponent: () =>
          import('./pages/admin/criteria-templates/criteria-template-detail/criteria-template-detail').then(
            (m) => m.CriteriaTemplateDetail,
          ),
      },
      {
        path: 'subjects',
        loadComponent: () =>
          import('./pages/admin/subjects/subject-list/subject-list').then((m) => m.SubjectList),
      },
      {
        path: 'subjects/new',
        loadComponent: () =>
          import('./pages/admin/subjects/subject-form/subject-form').then((m) => m.SubjectForm),
      },
      {
        path: 'subjects/:id',
        loadComponent: () =>
          import('./pages/admin/subjects/subject-detail/subject-detail').then(
            (m) => m.SubjectDetail,
          ),
      },
      {
        path: 'subjects/:id/edit',
        loadComponent: () =>
          import('./pages/admin/subjects/subject-form/subject-form').then((m) => m.SubjectForm),
      },
    ],
  },
  {
    path: 'search',
    loadComponent: () => import('./pages/search/search-results').then((m) => m.SearchResults),
  },
  {
    path: 'reviews',
    loadComponent: () =>
      import('./pages/reviews/review-list/review-list').then((m) => m.ReviewList),
  },
  {
    path: 'reviews/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/reviews/review-form/review-form').then((m) => m.ReviewForm),
  },
  {
    path: 'reviews/:id',
    loadComponent: () =>
      import('./pages/reviews/review-detail/review-detail').then((m) => m.ReviewDetail),
  },
  {
    path: 'reviews/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/reviews/review-form/review-form').then((m) => m.ReviewForm),
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
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profile/profile-page/profile-page').then((m) => m.ProfilePage),
  },
  {
    path: 'profile/email/confirm',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profile/email-confirm/email-confirm').then((m) => m.EmailConfirm),
  },
  {
    path: 'users/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/users/user-profile/user-profile').then((m) => m.UserProfilePage),
  },
  { path: 'access-denied', component: AccessDenied },
  { path: '**', component: NotFound },
];
