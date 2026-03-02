import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient, HttpContext } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { apiResponseInterceptor, SKIP_API_RESPONSE_UNWRAP } from './api-response.interceptor';

describe('apiResponseInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('unwraps data from a successful ApiResponse envelope', () => {
    const payload = { id: 1, name: 'Test' };
    let result: unknown;

    http.get('/api/test').subscribe((data) => (result = data));

    controller.expectOne('/api/test').flush({
      success: true,
      data: payload,
      error: null,
      traceId: 'abc',
      timestampUtc: '2026-01-01T00:00:00Z',
    });

    expect(result).toEqual(payload);
  });

  it('throws ApiError when envelope indicates failure', () => {
    const apiError = { code: 'TEST_ERROR', message: 'Bad request', details: null };
    let error: unknown;

    http.get('/api/test').subscribe({
      error: (e: unknown) => (error = e),
    });

    controller.expectOne('/api/test').flush({
      success: false,
      data: null,
      error: apiError,
      traceId: 'abc',
      timestampUtc: '2026-01-01T00:00:00Z',
    });

    expect(error).toBeTruthy();
    const err = error as { code: string; message: string };
    expect(err.code).toBe('TEST_ERROR');
    expect(err.message).toBe('Bad request');
  });

  it('passes through non-JSON responses unchanged', () => {
    let result: unknown;

    http.get('/api/file', { responseType: 'text' }).subscribe((data) => (result = data));

    controller.expectOne('/api/file').flush('raw text');

    expect(result).toBe('raw text');
  });

  it('can skip envelope unwrapping via HttpContext', () => {
    const payload = { id: 1, name: 'Test' };
    const context = new HttpContext().set(SKIP_API_RESPONSE_UNWRAP, true);
    let result: unknown;

    http.get('/api/test', { context }).subscribe((data) => (result = data));

    const envelope = {
      success: true,
      data: payload,
      error: null,
      traceId: 'abc',
      timestampUtc: '2026-01-01T00:00:00Z',
    };

    controller.expectOne('/api/test').flush(envelope);

    expect(result).toEqual(envelope);
  });
});
