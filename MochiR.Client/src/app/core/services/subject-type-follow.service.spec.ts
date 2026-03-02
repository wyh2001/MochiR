import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SubjectTypeFollowService } from './subject-type-follow.service';
import { apiResponseInterceptor } from '../interceptors/api-response.interceptor';

describe('SubjectTypeFollowService', () => {
  let service: SubjectTypeFollowService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(SubjectTypeFollowService);
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

  describe('followSubjectType', () => {
    const mockFollow = {
      followId: 1,
      subjectTypeId: 5,
      subjectTypeKey: 'movie',
      subjectTypeDisplayName: 'Movie',
      followedAtUtc: '2026-03-01T10:00:00Z',
    };

    it('sends POST /api/follows/subject-types/{id} and returns follow summary', () => {
      service.followSubjectType(5).subscribe((data) => {
        expect(data).toEqual(mockFollow);
      });

      const req = http.expectOne('/api/follows/subject-types/5');
      expect(req.request.method).toBe('POST');
      req.flush(envelope(mockFollow));
    });

    it('propagates error on failure', () => {
      let error: unknown;
      service.followSubjectType(5).subscribe({
        error: (e) => (error = e),
      });

      http
        .expectOne('/api/follows/subject-types/5')
        .flush(errorEnvelope('FOLLOW_FAILED', 'Cannot follow subject type'));

      expect(error).toEqual({
        code: 'FOLLOW_FAILED',
        message: 'Cannot follow subject type',
        details: null,
      });
    });
  });

  describe('unfollowSubjectType', () => {
    const mockUnfollow = {
      followId: 1,
      removed: true,
    };

    it('sends DELETE /api/follows/subject-types/{id} and returns deletion result', () => {
      service.unfollowSubjectType(5).subscribe((data) => {
        expect(data).toEqual(mockUnfollow);
      });

      const req = http.expectOne('/api/follows/subject-types/5');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope(mockUnfollow));
    });

    it('propagates error on failure', () => {
      let error: unknown;
      service.unfollowSubjectType(5).subscribe({
        error: (e) => (error = e),
      });

      http
        .expectOne('/api/follows/subject-types/5')
        .flush(errorEnvelope('UNFOLLOW_FAILED', 'Cannot unfollow subject type'));

      expect(error).toEqual({
        code: 'UNFOLLOW_FAILED',
        message: 'Cannot unfollow subject type',
        details: null,
      });
    });
  });

  describe('getFollowedSubjectTypes', () => {
    const mockPage = {
      totalCount: 2,
      page: 1,
      pageSize: 50,
      items: [
        {
          followId: 1,
          subjectTypeId: 5,
          subjectTypeKey: 'movie',
          subjectTypeDisplayName: 'Movie',
          followedAtUtc: '2026-02-01T00:00:00Z',
        },
        {
          followId: 2,
          subjectTypeId: 6,
          subjectTypeKey: 'book',
          subjectTypeDisplayName: 'Book',
          followedAtUtc: '2026-02-15T00:00:00Z',
        },
      ],
    };

    it('fetches followed subject types via GET /api/follows/subject-types with pagination', () => {
      service.getFollowedSubjectTypes(1, 50).subscribe((data) => {
        expect(data).toEqual(mockPage);
      });

      const req = http.expectOne('/api/follows/subject-types?Page=1&PageSize=50');
      expect(req.request.method).toBe('GET');
      req.flush(envelope(mockPage));
    });

    it('sends request without params when none provided', () => {
      service.getFollowedSubjectTypes().subscribe();

      const req = http.expectOne('/api/follows/subject-types');
      expect(req.request.method).toBe('GET');
      req.flush(envelope(mockPage));
    });

    it('propagates error on failure', () => {
      let error: unknown;
      service.getFollowedSubjectTypes(1, 50).subscribe({
        error: (e) => (error = e),
      });

      http
        .expectOne('/api/follows/subject-types?Page=1&PageSize=50')
        .flush(errorEnvelope('UNAUTHORIZED', 'Not authenticated'));

      expect(error).toEqual({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
        details: null,
      });
    });
  });
});
