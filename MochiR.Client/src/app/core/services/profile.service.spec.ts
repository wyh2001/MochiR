import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProfileService } from './profile.service';
import { apiResponseInterceptor } from '../interceptors/api-response.interceptor';

describe('ProfileService', () => {
  let service: ProfileService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ProfileService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const mockProfile = {
    id: 'user-1',
    userName: 'john',
    displayName: 'John Doe',
    email: 'john@example.com',
    emailConfirmed: true,
    phoneNumber: null,
    phoneNumberConfirmed: false,
    avatarUrl: 'https://example.com/avatar.jpg',
    twoFactorEnabled: false,
    lockoutEnabled: false,
    lockoutEnd: null,
    createdAtUtc: '2026-01-01T00:00:00Z',
    followersCount: 10,
    followingCount: 5,
    roles: [],
  };

  const envelope = (data: unknown) => ({
    success: true,
    data,
    error: null,
    traceId: '',
    timestampUtc: '',
  });

  const errorEnvelope = (code: string, message: string) => ({
    success: false,
    data: null,
    error: { code, message, details: null },
    traceId: '',
    timestampUtc: '',
  });

  describe('getProfile', () => {
    it('fetches the authenticated user profile', () => {
      service.getProfile().subscribe((data) => {
        expect(data).toEqual(mockProfile);
      });

      const req = http.expectOne('/api/me');
      expect(req.request.method).toBe('GET');
      req.flush(envelope(mockProfile));
    });

    it('throws on server error', () => {
      service.getProfile().subscribe({
        error: (err) => {
          expect(err.code).toBe('UNAUTHORIZED');
        },
      });

      http.expectOne('/api/me').flush(errorEnvelope('UNAUTHORIZED', 'Not authenticated'));
    });
  });

  describe('updateProfile', () => {
    it('sends PATCH with display name and avatar', () => {
      const dto = { displayName: 'Jane Doe', avatarUrl: 'https://example.com/new.jpg' };

      service.updateProfile(dto).subscribe((data) => {
        expect(data).toEqual({ ...mockProfile, displayName: 'Jane Doe' });
      });

      const req = http.expectOne('/api/me');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      req.flush(envelope({ ...mockProfile, displayName: 'Jane Doe' }));
    });

    it('throws on server error', () => {
      service.updateProfile({ displayName: '' }).subscribe({
        error: (err) => {
          expect(err.code).toBe('VALIDATION_ERROR');
        },
      });

      http.expectOne('/api/me').flush(errorEnvelope('VALIDATION_ERROR', 'Invalid data'));
    });
  });

  describe('changePassword', () => {
    it('sends POST with current and new passwords', () => {
      const dto = { currentPassword: 'old123', newPassword: 'new456' };

      service.changePassword(dto).subscribe((data) => {
        expect(data).toEqual(mockProfile);
      });

      const req = http.expectOne('/api/me/password/change');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(envelope(mockProfile));
    });

    it('throws on wrong current password', () => {
      service.changePassword({ currentPassword: 'wrong', newPassword: 'new456' }).subscribe({
        error: (err) => {
          expect(err.code).toBe('PASSWORD_MISMATCH');
        },
      });

      http
        .expectOne('/api/me/password/change')
        .flush(errorEnvelope('PASSWORD_MISMATCH', 'Current password is incorrect'));
    });
  });

  describe('requestEmailChange', () => {
    it('sends POST with current password and new email', () => {
      const dto = { currentPassword: 'pass123', email: 'new@example.com' };

      service.requestEmailChange(dto).subscribe((data) => {
        expect(data).toEqual({
          userId: 'user-1',
          email: 'new@example.com',
          purpose: 'EmailChange',
        });
      });

      const req = http.expectOne('/api/me/email/token');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(envelope({ userId: 'user-1', email: 'new@example.com', purpose: 'EmailChange' }));
    });

    it('throws on wrong password', () => {
      service.requestEmailChange({ currentPassword: 'wrong', email: 'new@example.com' }).subscribe({
        error: (err) => {
          expect(err.code).toBe('PASSWORD_MISMATCH');
        },
      });

      http
        .expectOne('/api/me/email/token')
        .flush(errorEnvelope('PASSWORD_MISMATCH', 'Current password is incorrect'));
    });
  });

  describe('confirmEmailChange', () => {
    it('sends POST with email and token', () => {
      const dto = { email: 'new@example.com', token: 'abc123' };

      service.confirmEmailChange(dto).subscribe((data) => {
        expect(data).toEqual({ ...mockProfile, email: 'new@example.com' });
      });

      const req = http.expectOne('/api/me/email/confirm');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(envelope({ ...mockProfile, email: 'new@example.com' }));
    });

    it('throws on invalid token', () => {
      service.confirmEmailChange({ email: 'new@example.com', token: 'bad' }).subscribe({
        error: (err) => {
          expect(err.code).toBe('INVALID_TOKEN');
        },
      });

      http
        .expectOne('/api/me/email/confirm')
        .flush(errorEnvelope('INVALID_TOKEN', 'Token is invalid or expired'));
    });
  });

  describe('getFollowers', () => {
    it('fetches followers without params', () => {
      const page = {
        totalCount: 2,
        page: 1,
        pageSize: 10,
        items: [
          {
            userId: 'f1',
            userName: 'alice',
            displayName: 'Alice',
            avatarUrl: null,
            followedAtUtc: '2026-02-01T00:00:00Z',
          },
        ],
      };

      service.getFollowers().subscribe((data) => {
        expect(data).toEqual(page);
      });

      http.expectOne('/api/me/followers').flush(envelope(page));
    });

    it('passes page and pageSize params', () => {
      service.getFollowers(2, 5).subscribe();

      const req = http.expectOne('/api/me/followers?Page=2&PageSize=5');
      expect(req.request.method).toBe('GET');
      req.flush(envelope({ totalCount: 0, page: 2, pageSize: 5, items: [] }));
    });

    it('throws on server error', () => {
      service.getFollowers().subscribe({
        error: (err) => {
          expect(err.code).toBe('INTERNAL_ERROR');
        },
      });

      http
        .expectOne('/api/me/followers')
        .flush(errorEnvelope('INTERNAL_ERROR', 'Something went wrong'));
    });
  });

  describe('removeFollower', () => {
    it('sends DELETE with userId', () => {
      service.removeFollower('f1').subscribe((data) => {
        expect(data).toEqual({ userId: 'f1', removed: true });
      });

      const req = http.expectOne('/api/me/followers/f1');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope({ userId: 'f1', removed: true }));
    });

    it('throws on server error', () => {
      service.removeFollower('bad').subscribe({
        error: (err) => {
          expect(err.code).toBe('FOLLOWER_NOT_FOUND');
        },
      });

      http
        .expectOne('/api/me/followers/bad')
        .flush(errorEnvelope('FOLLOWER_NOT_FOUND', 'Follower not found'));
    });
  });

  describe('getFollowing', () => {
    it('fetches following without params', () => {
      const page = {
        totalCount: 1,
        page: 1,
        pageSize: 10,
        items: [
          {
            userId: 'u2',
            userName: 'bob',
            displayName: 'Bob',
            avatarUrl: null,
            followedAtUtc: '2026-02-15T00:00:00Z',
          },
        ],
      };

      service.getFollowing().subscribe((data) => {
        expect(data).toEqual(page);
      });

      http.expectOne('/api/me/following').flush(envelope(page));
    });

    it('passes page and pageSize params', () => {
      service.getFollowing(3, 20).subscribe();

      const req = http.expectOne('/api/me/following?Page=3&PageSize=20');
      expect(req.request.method).toBe('GET');
      req.flush(envelope({ totalCount: 0, page: 3, pageSize: 20, items: [] }));
    });
  });
});
