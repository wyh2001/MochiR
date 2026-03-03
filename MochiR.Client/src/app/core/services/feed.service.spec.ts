import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FeedService } from './feed.service';
import { apiResponseInterceptor } from '../interceptors/api-response.interceptor';

describe('FeedService', () => {
  let service: FeedService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(FeedService);
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

  const mockFeedPage = {
    totalCount: 1,
    page: 1,
    pageSize: 20,
    items: [
      {
        reviewId: 2,
        createdAtUtc: '2026-01-16T08:00:00Z',
        subjectId: 11,
        subjectName: 'The Matrix',
        subjectSlug: 'the-matrix',
        subjectTypeId: 1,
        title: 'Classic',
        content: 'A classic sci-fi film',
        authorId: 'user2',
        authorUserName: 'jane',
        authorDisplayName: 'Jane Smith',
        authorAvatarUrl: 'https://example.com/avatar.jpg',
      },
    ],
    nextCursor: null,
    hasMore: false,
  };

  describe('getFollowing', () => {
    it('fetches following feed without params', () => {
      service.getFollowing().subscribe((data) => {
        expect(data).toEqual(mockFeedPage);
      });

      http.expectOne('/api/feed').flush(envelope(mockFeedPage));
    });

    it('sends pagination params when provided', () => {
      service.getFollowing({ after: '2026-01-01T00:00:00Z', afterId: 5 }).subscribe();

      const req = http.expectOne(
        (r) => r.url === '/api/feed' && r.params.get('After') === '2026-01-01T00:00:00Z',
      );
      expect(req.request.params.get('AfterId')).toBe('5');
      req.flush(envelope(mockFeedPage));
    });

    it('throws on server error', () => {
      service.getFollowing().subscribe({
        error: (err) => {
          expect(err.code).toBe('INTERNAL_ERROR');
        },
      });

      http.expectOne('/api/feed').flush(errorEnvelope('INTERNAL_ERROR', 'Something went wrong'));
    });
  });
});
