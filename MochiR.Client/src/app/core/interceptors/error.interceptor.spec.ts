import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from './error.interceptor';
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
});
