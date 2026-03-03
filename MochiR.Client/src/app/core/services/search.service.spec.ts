import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SearchService } from './search.service';
import { apiResponseInterceptor } from '../interceptors/api-response.interceptor';

describe('SearchService', () => {
  let service: SearchService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(SearchService);
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

  const mockSearchResponse = {
    results: [
      {
        type: 'Subject' as const,
        subjectId: 10,
        reviewId: null,
        title: 'Inception',
        subtitle: 'Movie',
        excerpt: 'A mind-bending thriller',
        score: 0.95,
        createdAtUtc: '2026-01-15T10:30:00Z',
      },
      {
        type: 'Review' as const,
        subjectId: 10,
        reviewId: 5,
        title: 'Great movie review',
        subtitle: null,
        excerpt: 'This movie is amazing',
        score: 0.8,
        createdAtUtc: '2026-01-14T08:00:00Z',
      },
    ],
    sort: 'Relevance',
    type: 'All',
    nextCursor: null,
  };

  describe('search', () => {
    it('fetches search results with query only', () => {
      service.search({ query: 'inception' }).subscribe((data) => {
        expect(data).toEqual(mockSearchResponse);
      });

      const req = http.expectOne((r) => r.url === '/api/search');
      expect(req.request.params.get('Query')).toBe('inception');
      expect(req.request.params.has('Type')).toBe(false);
      expect(req.request.params.has('Sort')).toBe(false);
      expect(req.request.params.has('Limit')).toBe(false);
      expect(req.request.params.has('Cursor')).toBe(false);
      req.flush(envelope(mockSearchResponse));
    });

    it('fetches search results with all params', () => {
      service
        .search({
          query: 'test',
          type: 'reviews',
          sort: 'latest',
          limit: 10,
          cursor: 'abc123',
        })
        .subscribe((data) => {
          expect(data).toEqual(mockSearchResponse);
        });

      const req = http.expectOne((r) => r.url === '/api/search');
      expect(req.request.params.get('Query')).toBe('test');
      expect(req.request.params.get('Type')).toBe('reviews');
      expect(req.request.params.get('Sort')).toBe('latest');
      expect(req.request.params.get('Limit')).toBe('10');
      expect(req.request.params.get('Cursor')).toBe('abc123');
      req.flush(envelope(mockSearchResponse));
    });

    it('throws on server error', () => {
      service.search({ query: 'fail' }).subscribe({
        error: (err) => {
          expect(err.code).toBe('SEARCH_QUERY_REQUIRED');
        },
      });

      http
        .expectOne((r) => r.url === '/api/search')
        .flush(errorEnvelope('SEARCH_QUERY_REQUIRED', 'Query is required'));
    });
  });
});
