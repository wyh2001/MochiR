import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PasswordReset } from './password-reset';
import { apiResponseInterceptor } from '../../../core/interceptors/api-response.interceptor';

describe('PasswordReset', () => {
  let fixture: ComponentFixture<PasswordReset>;
  let component: PasswordReset;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordReset],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PasswordReset);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('renders the password reset form', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('form')).toBeTruthy();
    expect(el.querySelector('input[formControlName="email"]')).toBeTruthy();
    expect(el.querySelector('button[type="submit"]')).toBeTruthy();
  });

  it('disables submit when email is empty', () => {
    const el: HTMLElement = fixture.nativeElement;
    const btn = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('shows email format validation', () => {
    component.form.controls.email.setValue('notanemail');
    component.form.controls.email.markAsTouched();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('input[formControlName="email"]')?.classList).toContain('is-invalid');
  });

  it('always shows success message after submit', () => {
    component.form.setValue({ email: 'test@test.com' });
    component.onSubmit();

    http.expectOne('/api/auth/password/reset/request').flush(null);

    fixture.detectChanges();

    expect(component.submitted()).toBe(true);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.alert-success')?.textContent).toContain(
      'If an account with that email exists',
    );
  });

  it('disables submit button during loading', () => {
    component.form.setValue({ email: 'test@test.com' });
    component.onSubmit();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const btn = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(component.submitting()).toBe(true);

    http.expectOne('/api/auth/password/reset/request').flush(null);

    expect(component.submitting()).toBe(false);
  });

  it('shows success even if API fails (anti-enumeration)', () => {
    component.form.setValue({ email: 'unknown@test.com' });
    component.onSubmit();

    http.expectOne('/api/auth/password/reset/request').flush({
      success: false,
      data: null,
      error: { code: 'NOT_FOUND', message: 'User not found.', details: null },
      traceId: '',
      timestampUtc: '',
    });

    fixture.detectChanges();

    expect(component.submitted()).toBe(true);
  });
});
