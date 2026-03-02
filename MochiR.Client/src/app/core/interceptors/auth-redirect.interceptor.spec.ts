import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { authRedirectInterceptor } from './auth-redirect.interceptor';
import { AuthStateService } from '../services/auth-state.service';

describe('authRedirectInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let router: Router;
  let authState: AuthStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authRedirectInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    authState = TestBed.inject(AuthStateService);

    vi.spyOn(router, 'navigateByUrl');
  });

  afterEach(() => controller.verify());

  it('redirects to /login on 401', () => {
    http.get('/api/me').subscribe({
      error: () => {
        /* expected error */
      },
    });

    controller.expectOne('/api/me').flush('', { status: 401, statusText: 'Unauthorized' });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('clears auth state on 401', () => {
    authState.setUser({
      userName: 'test',
      displayName: 'Test',
      email: 'test@test.com',
      isAdmin: false,
    });

    http.get('/api/me').subscribe({
      error: () => {
        /* expected error */
      },
    });

    controller.expectOne('/api/me').flush('', { status: 401, statusText: 'Unauthorized' });

    expect(authState.isAuthenticated()).toBe(false);
  });

  it('does NOT redirect on 401 for login endpoint', () => {
    http.post('/api/auth/login', {}).subscribe({
      error: () => {
        /* expected error */
      },
    });

    controller.expectOne('/api/auth/login').flush('', { status: 401, statusText: 'Unauthorized' });

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
