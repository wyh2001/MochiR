import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { PasswordResetConfirm } from './password-reset-confirm';
import { apiResponseInterceptor } from '../../../core/interceptors/api-response.interceptor';

describe('PasswordResetConfirm', () => {
  let fixture: ComponentFixture<PasswordResetConfirm>;
  let component: PasswordResetConfirm;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordResetConfirm],
      providers: [
        provideRouter([{ path: 'login', children: [] }]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParams: { email: 'test@test.com', token: 'abc123' } },
          },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(PasswordResetConfirm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('renders the password reset confirm form', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('form')).toBeTruthy();
    expect(el.querySelector('input[formControlName="newPassword"]')).toBeTruthy();
    expect(el.querySelector('button[type="submit"]')).toBeTruthy();
  });

  it('reads email and token from query params', () => {
    expect(component.email).toBe('test@test.com');
    expect(component.token).toBe('abc123');
  });

  it('disables submit when password is empty', () => {
    const el: HTMLElement = fixture.nativeElement;
    const btn = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('redirects to /login on success', () => {
    const spy = vi.spyOn(router, 'navigateByUrl');

    component.form.setValue({ newPassword: 'NewPassword1!' });
    component.onSubmit();

    http.expectOne('/api/auth/password/reset/confirm').flush(null);

    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('/login');
  });

  it('displays server error for invalid token', () => {
    component.form.setValue({ newPassword: 'NewPassword1!' });
    component.onSubmit();

    http.expectOne('/api/auth/password/reset/confirm').flush({
      success: false,
      data: null,
      error: {
        code: 'INVALID_TOKEN',
        message: 'The reset token is invalid or expired.',
        details: null,
      },
      traceId: '',
      timestampUtc: '',
    });

    fixture.detectChanges();

    expect(component.serverError()).toBe('The reset token is invalid or expired.');
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.alert-danger')?.textContent).toContain('invalid or expired');
  });

  it('displays server errors for password policy violations', () => {
    component.form.setValue({ newPassword: '123' });
    component.onSubmit();

    http.expectOne('/api/auth/password/reset/confirm').flush({
      success: false,
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'One or more validation errors occurred.',
        details: {
          PasswordTooShort: ['Passwords must be at least 6 characters.'],
        },
      },
      traceId: '',
      timestampUtc: '',
    });

    fixture.detectChanges();

    expect(component.serverErrors().length).toBe(1);
    expect(component.serverErrors()).toContain('Passwords must be at least 6 characters.');
  });

  it('disables submit button during loading', () => {
    component.form.setValue({ newPassword: 'NewPassword1!' });
    component.onSubmit();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const btn = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    http.expectOne('/api/auth/password/reset/confirm').flush(null);

    expect(component.submitting()).toBe(false);
  });
});
