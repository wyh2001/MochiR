import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RatingService } from './rating.service';
import { apiResponseInterceptor } from '../interceptors/api-response.interceptor';

describe('RatingService', () => {
  let service: RatingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(RatingService);
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

  describe('getAggregate', () => {
    const mockAggregate = {
      subjectId: 42,
      countReviews: 10,
      avgOverall: 4.5,
      metrics: [
        { key: 'acting', value: 4.2, count: 8, note: null },
        { key: 'plot', value: 4.8, count: 10, note: null },
      ],
      updatedAt: '2026-03-01T00:00:00Z',
    };

    it('fetches aggregate via GET /api/ratings/subjects/{id}', () => {
      service.getAggregate(42).subscribe((data) => {
        expect(data).toEqual(mockAggregate);
      });

      const req = http.expectOne('/api/ratings/subjects/42');
      expect(req.request.method).toBe('GET');
      req.flush(envelope(mockAggregate));
    });

    it('propagates error on failure', () => {
      let error: unknown;
      service.getAggregate(999).subscribe({
        error: (e) => (error = e),
      });

      http
        .expectOne('/api/ratings/subjects/999')
        .flush(errorEnvelope('NOT_FOUND', 'Aggregate not found'));

      expect(error).toEqual({
        code: 'NOT_FOUND',
        message: 'Aggregate not found',
        details: null,
      });
    });
  });
});
