import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { guestGuard } from './guest.guard';
import { AuthStateService } from '../services/auth-state.service';

@Component({ template: '' })
class DummyComponent {}

describe('guestGuard', () => {
  let authState: AuthStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: DummyComponent, canActivate: [guestGuard] },
          { path: '', component: DummyComponent },
        ]),
      ],
    });
    authState = TestBed.inject(AuthStateService);
    router = TestBed.inject(Router);
  });

  it('allows access when NOT authenticated', async () => {
    const result = await router.navigateByUrl('/login');
    expect(result).toBe(true);
    expect(router.url).toBe('/login');
  });

  it('redirects to / when authenticated', async () => {
    authState.setUser({
      userName: 'test',
      displayName: 'Test',
      email: 'test@test.com',
      isAdmin: false,
    });

    const result = await router.navigateByUrl('/login');
    expect(result).toBe(true);
    expect(router.url).toBe('/');
  });
});
