import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SubjectFollowService } from './subject-follow.service';
import { apiResponseInterceptor } from '../interceptors/api-response.interceptor';

describe('SubjectFollowService', () => {
  let service: SubjectFollowService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(SubjectFollowService);
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

  describe('followSubject', () => {
    const mockFollow = {
      followId: 1,
      subjectId: 42,
      subjectName: 'Inception',
      subjectSlug: 'inception',
      followedAtUtc: '2026-03-01T10:00:00Z',
    };

    it('sends POST /api/follows/subjects/{id} and returns follow summary', () => {
      service.followSubject(42).subscribe((data) => {
        expect(data).toEqual(mockFollow);
      });

      const req = http.expectOne('/api/follows/subjects/42');
      expect(req.request.method).toBe('POST');
      req.flush(envelope(mockFollow));
    });

    it('propagates error on failure', () => {
      let error: unknown;
      service.followSubject(42).subscribe({
        error: (e) => (error = e),
      });

      http
        .expectOne('/api/follows/subjects/42')
        .flush(errorEnvelope('FOLLOW_FAILED', 'Cannot follow subject'));

      expect(error).toEqual({
        code: 'FOLLOW_FAILED',
        message: 'Cannot follow subject',
        details: null,
      });
    });
  });

  describe('unfollowSubject', () => {
    const mockUnfollow = {
      followId: 1,
      removed: true,
    };

    it('sends DELETE /api/follows/subjects/{id} and returns deletion result', () => {
      service.unfollowSubject(42).subscribe((data) => {
        expect(data).toEqual(mockUnfollow);
      });

      const req = http.expectOne('/api/follows/subjects/42');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope(mockUnfollow));
    });

    it('propagates error on failure', () => {
      let error: unknown;
      service.unfollowSubject(42).subscribe({
        error: (e) => (error = e),
      });

      http
        .expectOne('/api/follows/subjects/42')
        .flush(errorEnvelope('UNFOLLOW_FAILED', 'Cannot unfollow subject'));

      expect(error).toEqual({
        code: 'UNFOLLOW_FAILED',
        message: 'Cannot unfollow subject',
        details: null,
      });
    });
  });

  describe('getFollowedSubjects', () => {
    const mockPage = {
      totalCount: 2,
      page: 1,
      pageSize: 50,
      items: [
        {
          followId: 1,
          subjectId: 42,
          subjectName: 'Inception',
          subjectSlug: 'inception',
          followedAtUtc: '2026-02-01T00:00:00Z',
        },
        {
          followId: 2,
          subjectId: 43,
          subjectName: 'Interstellar',
          subjectSlug: 'interstellar',
          followedAtUtc: '2026-02-15T00:00:00Z',
        },
      ],
    };

    it('fetches followed subjects via GET /api/follows/subjects with pagination', () => {
      service.getFollowedSubjects(1, 50).subscribe((data) => {
        expect(data).toEqual(mockPage);
      });

      const req = http.expectOne('/api/follows/subjects?Page=1&PageSize=50');
      expect(req.request.method).toBe('GET');
      req.flush(envelope(mockPage));
    });

    it('sends request without params when none provided', () => {
      service.getFollowedSubjects().subscribe();

      const req = http.expectOne('/api/follows/subjects');
      expect(req.request.method).toBe('GET');
      req.flush(envelope(mockPage));
    });

    it('propagates error on failure', () => {
      let error: unknown;
      service.getFollowedSubjects(1, 50).subscribe({
        error: (e) => (error = e),
      });

      http
        .expectOne('/api/follows/subjects?Page=1&PageSize=50')
        .flush(errorEnvelope('UNAUTHORIZED', 'Not authenticated'));

      expect(error).toEqual({ code: 'UNAUTHORIZED', message: 'Not authenticated', details: null });
    });
  });
});
