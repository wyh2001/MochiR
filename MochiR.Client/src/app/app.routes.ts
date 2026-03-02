import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { NotFound } from './pages/not-found/not-found';
import { AccessDenied } from './pages/access-denied/access-denied';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'access-denied', component: AccessDenied },
  { path: '**', component: NotFound },
];
