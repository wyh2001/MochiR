import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReviewService } from './review.service';
import { apiResponseInterceptor } from '../interceptors/api-response.interceptor';

describe('ReviewService', () => {
  let service: ReviewService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ReviewService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const mockSummary = {
    id: 1,
    subjectId: 1,
    subjectName: 'Inception',
    userId: 'john',
    authorUserName: 'john',
    authorDisplayName: 'John Doe',
    authorAvatarUrl: null,
    title: 'Great movie',
    content: 'Full content here',
    excerpt: 'Great movie...',
    excerptIsAuto: true,
    ratings: [{ key: 'story', label: 'Story', score: 9 }],
    status: 1,
    tags: ['sci-fi'],
    likeCount: 5,
    isLikedByCurrentUser: false,
    createdAt: '2026-01-15T10:30:00Z',
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

  describe('getLatest', () => {
    it('fetches latest reviews without params', () => {
      const page = {
        totalCount: 1,
        page: 1,
        pageSize: 10,
        items: [mockSummary],
        nextCursor: null,
        hasMore: false,
      };

      service.getLatest().subscribe((data) => {
        expect(data).toEqual(page);
      });

      http.expectOne('/api/reviews/latest').flush(envelope(page));
    });

    it('passes cursor params', () => {
      service
        .getLatest({
          after: '2026-01-15T10:30:00Z',
          afterId: 1,
          pageSize: 5,
        })
        .subscribe();

      const req = http.expectOne(
        '/api/reviews/latest?PageSize=5&After=2026-01-15T10:30:00Z&AfterId=1',
      );
      expect(req.request.method).toBe('GET');
      req.flush(
        envelope({
          totalCount: 0,
          page: 1,
          pageSize: 5,
          items: [],
          nextCursor: null,
          hasMore: false,
        }),
      );
    });
  });

  describe('getAll', () => {
    it('fetches all reviews without filters', () => {
      service.getAll().subscribe((data) => {
        expect(data).toEqual([mockSummary]);
      });

      http.expectOne('/api/reviews').flush(envelope([mockSummary]));
    });

    it('filters by subjectId', () => {
      service.getAll({ subjectId: 1 }).subscribe();

      const req = http.expectOne('/api/reviews?subjectId=1');
      expect(req.request.method).toBe('GET');
      req.flush(envelope([]));
    });

    it('filters by userId', () => {
      service.getAll({ userId: 'john' }).subscribe();

      const req = http.expectOne('/api/reviews?userId=john');
      expect(req.request.method).toBe('GET');
      req.flush(envelope([]));
    });

    it('throws on server error', () => {
      service.getAll().subscribe({
        error: (err) => {
          expect(err.code).toBe('INTERNAL_ERROR');
        },
      });

      http.expectOne('/api/reviews').flush(errorEnvelope('INTERNAL_ERROR', 'Something went wrong'));
    });
  });

  describe('getById', () => {
    it('fetches review by id', () => {
      const detail = {
        ...mockSummary,
        subjectSlug: 'inception',
        updatedAt: '2026-01-16T10:30:00Z',
        media: [],
      };

      service.getById(1).subscribe((data) => {
        expect(data).toEqual(detail);
      });

      http.expectOne('/api/reviews/1').flush(envelope(detail));
    });

    it('throws on not found', () => {
      service.getById(999).subscribe({
        error: (err) => {
          expect(err.code).toBe('REVIEW_NOT_FOUND');
        },
      });

      http
        .expectOne('/api/reviews/999')
        .flush(errorEnvelope('REVIEW_NOT_FOUND', 'Review not found'));
    });
  });

  describe('create', () => {
    it('sends POST with correct payload', () => {
      const dto = {
        subjectId: 1,
        title: 'Great movie',
        content: 'Full content',
        excerpt: null,
        ratings: [{ key: 'story', label: 'Story', score: 9 }],
        tags: ['sci-fi'],
      };

      service.create(dto).subscribe();

      const req = http.expectOne('/api/reviews');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(envelope(mockSummary));
    });

    it('throws on subject not found', () => {
      service
        .create({
          subjectId: 999,
          title: 'Test',
          content: null,
          excerpt: null,
          ratings: null,
          tags: null,
        })
        .subscribe({
          error: (err) => {
            expect(err.code).toBe('REVIEW_SUBJECT_NOT_FOUND');
          },
        });

      http
        .expectOne('/api/reviews')
        .flush(errorEnvelope('REVIEW_SUBJECT_NOT_FOUND', 'Subject not found'));
    });
  });

  describe('update', () => {
    it('sends PUT with correct payload', () => {
      const dto = {
        title: 'Updated title',
        content: 'Updated content',
        excerpt: null,
        ratings: [{ key: 'story', label: 'Story', score: 10 }],
        tags: ['sci-fi', 'thriller'],
      };

      service.update(1, dto).subscribe();

      const req = http.expectOne('/api/reviews/1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      req.flush(envelope(mockSummary));
    });

    it('throws on server error', () => {
      service
        .update(1, {
          title: 'Test',
          content: null,
          excerpt: null,
          ratings: null,
          tags: null,
        })
        .subscribe({
          error: (err) => {
            expect(err.code).toBe('REVIEW_UPDATE_FAILED');
          },
        });

      http
        .expectOne('/api/reviews/1')
        .flush(errorEnvelope('REVIEW_UPDATE_FAILED', 'Update failed'));
    });
  });

  describe('delete', () => {
    it('sends DELETE and returns result', () => {
      service.delete(1).subscribe((result) => {
        expect(result).toEqual({ id: 1, deleted: true });
      });

      const req = http.expectOne('/api/reviews/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope({ id: 1, deleted: true }));
    });

    it('throws on delete error', () => {
      service.delete(999).subscribe({
        error: (err) => {
          expect(err.code).toBe('REVIEW_NOT_FOUND');
        },
      });

      http
        .expectOne('/api/reviews/999')
        .flush(errorEnvelope('REVIEW_NOT_FOUND', 'Review not found'));
    });
  });

  describe('like', () => {
    it('sends POST to like endpoint', () => {
      service.like(1).subscribe((result) => {
        expect(result).toEqual({ reviewId: 1, likeCount: 6, isLikedByCurrentUser: true });
      });

      const req = http.expectOne('/api/reviews/1/like');
      expect(req.request.method).toBe('POST');
      req.flush(envelope({ reviewId: 1, likeCount: 6, isLikedByCurrentUser: true }));
    });
  });

  describe('unlike', () => {
    it('sends DELETE to like endpoint', () => {
      service.unlike(1).subscribe((result) => {
        expect(result).toEqual({ reviewId: 1, likeCount: 4, isLikedByCurrentUser: false });
      });

      const req = http.expectOne('/api/reviews/1/like');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope({ reviewId: 1, likeCount: 4, isLikedByCurrentUser: false }));
    });
  });
});
