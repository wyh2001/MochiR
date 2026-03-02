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

  const mockLatestPage = {
    totalCount: 1,
    page: 1,
    pageSize: 20,
    items: [
      {
        id: 1,
        subjectId: 10,
        subjectName: 'Inception',
        userId: 'user1',
        authorUserName: 'john',
        authorDisplayName: 'John Doe',
        authorAvatarUrl: null,
        title: 'Great movie',
        content: 'Full review content',
        excerpt: 'Great movie...',
        excerptIsAuto: true,
        ratings: [{ key: 'overall', label: 'Overall', score: 9 }],
        status: 1,
        tags: ['sci-fi'],
        likeCount: 5,
        isLikedByCurrentUser: false,
        createdAt: '2026-01-15T10:30:00Z',
      },
    ],
    nextCursor: null,
    hasMore: false,
  };

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

  describe('getLatest', () => {
    it('fetches latest reviews', () => {
      service.getLatest().subscribe((data) => {
        expect(data).toEqual(mockLatestPage);
      });

      http.expectOne('/api/reviews/latest').flush(envelope(mockLatestPage));
    });

    it('throws on server error', () => {
      service.getLatest().subscribe({
        error: (err) => {
          expect(err.code).toBe('INTERNAL_ERROR');
        },
      });

      http
        .expectOne('/api/reviews/latest')
        .flush(errorEnvelope('INTERNAL_ERROR', 'Something went wrong'));
    });
  });

  describe('getFollowing', () => {
    it('fetches following feed', () => {
      service.getFollowing().subscribe((data) => {
        expect(data).toEqual(mockFeedPage);
      });

      http.expectOne('/api/feed').flush(envelope(mockFeedPage));
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
