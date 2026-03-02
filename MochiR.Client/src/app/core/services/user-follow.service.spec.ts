import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserFollowService } from './user-follow.service';
import { apiResponseInterceptor } from '../interceptors/api-response.interceptor';

describe('UserFollowService', () => {
  let service: UserFollowService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(UserFollowService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

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

  describe('getUserProfile', () => {
    const mockResponse = {
      public: {
        id: 'user-b-id',
        userName: 'bob',
        displayName: 'Bob Smith',
        avatarUrl: null,
        createdAtUtc: '2026-01-15T12:00:00Z',
      },
      sensitive: null,
    };

    it('fetches public profile via GET /api/users/{id}', () => {
      service.getUserProfile('user-b-id').subscribe((data) => {
        expect(data).toEqual(mockResponse);
      });

      const req = http.expectOne('/api/users/user-b-id');
      expect(req.request.method).toBe('GET');
      req.flush(envelope(mockResponse));
    });

    it('propagates error on failure', () => {
      let error: unknown;
      service.getUserProfile('nonexistent').subscribe({
        error: (e) => (error = e),
      });

      http
        .expectOne('/api/users/nonexistent')
        .flush(errorEnvelope('USER_NOT_FOUND', 'User not found'));

      expect(error).toEqual({ code: 'USER_NOT_FOUND', message: 'User not found', details: null });
    });
  });

  describe('followUser', () => {
    const mockFollow = {
      followId: 1,
      userId: 'user-b-id',
      userName: 'bob',
      displayName: 'Bob Smith',
      avatarUrl: null,
      followedAtUtc: '2026-03-01T10:00:00Z',
    };

    it('sends POST /api/follows/users/{id} and returns follow summary', () => {
      service.followUser('user-b-id').subscribe((data) => {
        expect(data).toEqual(mockFollow);
      });

      const req = http.expectOne('/api/follows/users/user-b-id');
      expect(req.request.method).toBe('POST');
      req.flush(envelope(mockFollow));
    });

    it('propagates error on failure', () => {
      let error: unknown;
      service.followUser('user-b-id').subscribe({
        error: (e) => (error = e),
      });

      http
        .expectOne('/api/follows/users/user-b-id')
        .flush(errorEnvelope('FOLLOW_FAILED', 'Cannot follow user'));

      expect(error).toEqual({
        code: 'FOLLOW_FAILED',
        message: 'Cannot follow user',
        details: null,
      });
    });
  });

  describe('unfollowUser', () => {
    const mockUnfollow = {
      followId: 1,
      removed: true,
    };

    it('sends DELETE /api/follows/users/{id} and returns deletion result', () => {
      service.unfollowUser('user-b-id').subscribe((data) => {
        expect(data).toEqual(mockUnfollow);
      });

      const req = http.expectOne('/api/follows/users/user-b-id');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope(mockUnfollow));
    });

    it('propagates error on failure', () => {
      let error: unknown;
      service.unfollowUser('user-b-id').subscribe({
        error: (e) => (error = e),
      });

      http
        .expectOne('/api/follows/users/user-b-id')
        .flush(errorEnvelope('UNFOLLOW_FAILED', 'Cannot unfollow user'));

      expect(error).toEqual({
        code: 'UNFOLLOW_FAILED',
        message: 'Cannot unfollow user',
        details: null,
      });
    });
  });

  describe('getFollowing', () => {
    const mockPage = {
      totalCount: 2,
      page: 1,
      pageSize: 50,
      items: [
        {
          followId: 1,
          userId: 'user-b-id',
          userName: 'bob',
          displayName: 'Bob Smith',
          avatarUrl: null,
          followedAtUtc: '2026-02-01T00:00:00Z',
        },
        {
          followId: 2,
          userId: 'user-c-id',
          userName: 'carol',
          displayName: 'Carol',
          avatarUrl: null,
          followedAtUtc: '2026-02-15T00:00:00Z',
        },
      ],
    };

    it('fetches following list via GET /api/follows/users with pagination', () => {
      service.getFollowing(1, 50).subscribe((data) => {
        expect(data).toEqual(mockPage);
      });

      const req = http.expectOne('/api/follows/users?Page=1&PageSize=50');
      expect(req.request.method).toBe('GET');
      req.flush(envelope(mockPage));
    });

    it('propagates error on failure', () => {
      let error: unknown;
      service.getFollowing(1, 50).subscribe({
        error: (e) => (error = e),
      });

      http
        .expectOne('/api/follows/users?Page=1&PageSize=50')
        .flush(errorEnvelope('UNAUTHORIZED', 'Not authenticated'));

      expect(error).toEqual({ code: 'UNAUTHORIZED', message: 'Not authenticated', details: null });
    });
  });
});
