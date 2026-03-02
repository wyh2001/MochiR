import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { AuthStateService } from './auth-state.service';

describe('AuthService', () => {
  let service: AuthService;
  let authState: AuthStateService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    authState = TestBed.inject(AuthStateService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  describe('login', () => {
    it('calls POST /api/auth/login and then fetches profile', () => {
      service.login({ userNameOrEmail: 'test', password: 'pass' }).subscribe();

      controller.expectOne('/api/auth/login').flush(null);

      const profileReq = controller.expectOne('/api/me');
      profileReq.flush({
        id: '1',
        userName: 'test',
        displayName: 'Test User',
        email: 'test@test.com',
        emailConfirmed: true,
        phoneNumber: null,
        phoneNumberConfirmed: false,
        avatarUrl: null,
        twoFactorEnabled: false,
        lockoutEnabled: true,
        lockoutEnd: null,
        createdAtUtc: '2026-01-01T00:00:00Z',
        followersCount: 0,
        followingCount: 0,
      });

      expect(authState.isAuthenticated()).toBe(true);
      expect(authState.user()?.userName).toBe('test');
    });
  });

  describe('register', () => {
    it('calls POST /api/auth/register', () => {
      let completed = false;
      service
        .register({ userName: 'new', email: 'new@test.com', password: 'pass' })
        .subscribe(() => (completed = true));

      controller.expectOne('/api/auth/register').flush(null);

      expect(completed).toBe(true);
      expect(authState.isAuthenticated()).toBe(false);
    });
  });

  describe('logout', () => {
    it('calls POST /api/auth/logout and clears auth state', () => {
      authState.setUser({
        userName: 'test',
        displayName: 'Test',
        email: 'test@test.com',
        isAdmin: false,
      });

      service.logout().subscribe();

      controller.expectOne('/api/auth/logout').flush(null);

      expect(authState.isAuthenticated()).toBe(false);
    });
  });

  describe('bootstrap', () => {
    it('populates auth state on 200', () => {
      service.bootstrap().subscribe();

      controller.expectOne('/api/me').flush({
        id: '1',
        userName: 'test',
        displayName: 'Test User',
        email: 'test@test.com',
        emailConfirmed: true,
        phoneNumber: null,
        phoneNumberConfirmed: false,
        avatarUrl: null,
        twoFactorEnabled: false,
        lockoutEnabled: true,
        lockoutEnd: null,
        createdAtUtc: '2026-01-01T00:00:00Z',
        followersCount: 0,
        followingCount: 0,
      });

      expect(authState.isAuthenticated()).toBe(true);
      expect(authState.user()?.userName).toBe('test');
    });

    it('clears auth state on 401 without throwing', () => {
      let completed = false;
      service.bootstrap().subscribe(() => (completed = true));

      controller.expectOne('/api/me').flush('', { status: 401, statusText: 'Unauthorized' });

      expect(completed).toBe(true);
      expect(authState.isAuthenticated()).toBe(false);
    });
  });

  describe('requestPasswordReset', () => {
    it('calls POST /api/auth/password/reset/request', () => {
      let completed = false;
      service.requestPasswordReset({ email: 'test@test.com' }).subscribe(() => (completed = true));

      controller.expectOne('/api/auth/password/reset/request').flush(null);

      expect(completed).toBe(true);
    });
  });

  describe('confirmPasswordReset', () => {
    it('calls POST /api/auth/password/reset/confirm', () => {
      let completed = false;
      service
        .confirmPasswordReset({
          email: 'test@test.com',
          token: 'abc',
          newPassword: 'newpass',
        })
        .subscribe(() => (completed = true));

      controller.expectOne('/api/auth/password/reset/confirm').flush(null);

      expect(completed).toBe(true);
    });
  });
});
