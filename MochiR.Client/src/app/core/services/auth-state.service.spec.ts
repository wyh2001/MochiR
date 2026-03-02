import { TestBed } from '@angular/core/testing';
import { AuthStateService, UserProfile } from './auth-state.service';

describe('AuthStateService', () => {
  let service: AuthStateService;

  const mockUser: UserProfile = {
    id: 'user-1',
    userName: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    isAdmin: false,
  };

  const mockAdmin: UserProfile = {
    id: 'admin-1',
    userName: 'admin',
    displayName: 'Admin',
    email: 'admin@example.com',
    isAdmin: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthStateService);
  });

  it('starts as unauthenticated', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
    expect(service.isAdmin()).toBe(false);
  });

  it('becomes authenticated after setUser()', () => {
    service.setUser(mockUser);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()).toEqual(mockUser);
  });

  it('computes isAdmin from user profile', () => {
    service.setUser(mockAdmin);
    expect(service.isAdmin()).toBe(true);
  });

  it('returns isAdmin false for non-admin user', () => {
    service.setUser(mockUser);
    expect(service.isAdmin()).toBe(false);
  });

  it('resets to unauthenticated after clear()', () => {
    service.setUser(mockUser);
    service.clear();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
    expect(service.isAdmin()).toBe(false);
  });
});
