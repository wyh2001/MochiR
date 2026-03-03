import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient, HttpContext } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor, SKIP_ERROR_TOAST, withSkipErrorToast } from './error.interceptor';
import { NotificationService } from '../services/notification.service';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let notifications: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    notifications = TestBed.inject(NotificationService);
  });

  afterEach(() => controller.verify());

  it('shows notification on 400 error', () => {
    http.get('/api/test').subscribe({
      error: () => {
        /* expected error */
      },
    });

    controller
      .expectOne('/api/test')
      .flush('Bad Request', { status: 400, statusText: 'Bad Request' });

    expect(notifications.notifications().length).toBe(1);
    expect(notifications.notifications()[0].type).toBe('danger');
  });

  it('shows generic message on 500 error', () => {
    http.get('/api/test').subscribe({
      error: () => {
        /* expected error */
      },
    });

    controller
      .expectOne('/api/test')
      .flush('', { status: 500, statusText: 'Internal Server Error' });

    const items = notifications.notifications();
    expect(items.length).toBe(1);
    expect(items[0].message).toContain('Something went wrong');
  });

  it('does NOT show notification on 401 error', () => {
    http.get('/api/test').subscribe({
      error: () => {
        /* expected error */
      },
    });

    controller.expectOne('/api/test').flush('', { status: 401, statusText: 'Unauthorized' });

    expect(notifications.notifications().length).toBe(0);
  });

  it('re-throws the error to callers', () => {
    let caughtError: unknown;
    http.get('/api/test').subscribe({ error: (e: unknown) => (caughtError = e) });

    controller.expectOne('/api/test').flush('', { status: 400, statusText: 'Bad Request' });

    expect(caughtError).toBeTruthy();
  });

  it('does NOT show notification when SKIP_ERROR_TOAST is set', () => {
    const context = withSkipErrorToast();
    http.get('/api/test', { context }).subscribe({
      error: () => {
        /* expected error */
      },
    });

    controller
      .expectOne('/api/test')
      .flush('Bad Request', { status: 400, statusText: 'Bad Request' });

    expect(notifications.notifications().length).toBe(0);
  });

  it('still re-throws error when SKIP_ERROR_TOAST is set', () => {
    let caughtError: unknown;
    const context = withSkipErrorToast();
    http.get('/api/test', { context }).subscribe({ error: (e: unknown) => (caughtError = e) });

    controller.expectOne('/api/test').flush('', { status: 400, statusText: 'Bad Request' });

    expect(caughtError).toBeTruthy();
  });

  it('withSkipErrorToast returns an HttpContext with SKIP_ERROR_TOAST=true', () => {
    const context = withSkipErrorToast();
    expect(context).toBeInstanceOf(HttpContext);
    expect(context.get(SKIP_ERROR_TOAST)).toBe(true);
  });
});
