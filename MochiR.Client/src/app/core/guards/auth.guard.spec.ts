import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthStateService } from '../services/auth-state.service';

@Component({ template: '' })
class DummyComponent {}

describe('authGuard', () => {
  let authState: AuthStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'protected', component: DummyComponent, canActivate: [authGuard] },
          { path: 'login', component: DummyComponent },
        ]),
      ],
    });
    authState = TestBed.inject(AuthStateService);
    router = TestBed.inject(Router);
  });

  it('allows access when authenticated', async () => {
    authState.setUser({
      userName: 'test',
      displayName: 'Test',
      email: 'test@test.com',
      isAdmin: false,
    });

    const result = await router.navigateByUrl('/protected');
    expect(result).toBe(true);
  });

  it('redirects to /login when not authenticated', async () => {
    const result = await router.navigateByUrl('/protected');
    expect(result).toBe(true);
    expect(router.url).toBe('/login');
  });
});
