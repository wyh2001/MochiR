import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthStateService } from '../services/auth-state.service';

@Component({ template: '' })
class DummyComponent {}

describe('adminGuard', () => {
  let authState: AuthStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'admin', component: DummyComponent, canActivate: [adminGuard] },
          { path: 'access-denied', component: DummyComponent },
        ]),
      ],
    });
    authState = TestBed.inject(AuthStateService);
    router = TestBed.inject(Router);
  });

  it('allows access when user is admin', async () => {
    authState.setUser({
      id: 'admin-1',
      userName: 'admin',
      displayName: 'Admin',
      email: 'admin@test.com',
      isAdmin: true,
    });

    const result = await router.navigateByUrl('/admin');
    expect(result).toBe(true);
    expect(router.url).toBe('/admin');
  });

  it('redirects to /access-denied when not admin', async () => {
    authState.setUser({
      id: 'user-1',
      userName: 'user',
      displayName: 'User',
      email: 'user@test.com',
      isAdmin: false,
    });

    const result = await router.navigateByUrl('/admin');
    expect(result).toBe(true);
    expect(router.url).toBe('/access-denied');
  });
});
