import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { EmailConfirm } from './email-confirm';
import { apiResponseInterceptor } from '../../../core/interceptors/api-response.interceptor';

describe('EmailConfirm', () => {
  let fixture: ComponentFixture<EmailConfirm>;
  let http: HttpTestingController;
  let router: Router;

  const mockProfile = {
    id: 'user-1',
    userName: 'john',
    displayName: 'John Doe',
    email: 'new@example.com',
    emailConfirmed: true,
    phoneNumber: null,
    phoneNumberConfirmed: false,
    avatarUrl: null,
    twoFactorEnabled: false,
    lockoutEnabled: false,
    lockoutEnd: null,
    createdAtUtc: '2026-01-01T00:00:00Z',
    followersCount: 0,
    followingCount: 0,
    roles: [],
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

  function createWithParams(queryParams: Record<string, string>) {
    TestBed.configureTestingModule({
      imports: [EmailConfirm],
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'profile', component: EmailConfirm },
          { path: 'profile/email/confirm', component: EmailConfirm },
        ]),
        { provide: ActivatedRoute, useValue: { queryParams: of(queryParams) } },
      ],
    });

    fixture = TestBed.createComponent(EmailConfirm);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl');
    fixture.detectChanges();
    return { fixture, http, router };
  }

  afterEach(() => http.verify());

  it('auto-submits confirmation with email and token from query params', () => {
    createWithParams({ email: 'new@example.com', token: 'abc123' });

    const req = http.expectOne('/api/me/email/confirm');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'new@example.com', token: 'abc123' });
    req.flush(envelope(mockProfile));
    fixture.detectChanges();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/profile');
  });

  it('shows success message on successful confirmation', () => {
    createWithParams({ email: 'new@example.com', token: 'abc123' });

    http.expectOne('/api/me/email/confirm').flush(envelope(mockProfile));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('email has been updated');
  });

  it('shows error message on invalid token', () => {
    createWithParams({ email: 'new@example.com', token: 'bad' });

    http
      .expectOne('/api/me/email/confirm')
      .flush(errorEnvelope('INVALID_TOKEN', 'Token is invalid or expired'));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Token is invalid or expired');
  });

  it('shows error when query params are missing', () => {
    createWithParams({});
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Missing');
  });
});
