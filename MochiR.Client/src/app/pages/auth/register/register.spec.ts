import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Register } from './register';
import { apiResponseInterceptor } from '../../../core/interceptors/api-response.interceptor';
import { NotificationService } from '../../../core/services/notification.service';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let component: Register;
  let http: HttpTestingController;
  let router: Router;
  let notifications: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideRouter([{ path: 'login', children: [] }]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    notifications = TestBed.inject(NotificationService);
    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('renders the register form', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('form')).toBeTruthy();
    expect(el.querySelector('input[formControlName="userName"]')).toBeTruthy();
    expect(el.querySelector('input[formControlName="email"]')).toBeTruthy();
    expect(el.querySelector('input[formControlName="password"]')).toBeTruthy();
    expect(el.querySelector('button[type="submit"]')).toBeTruthy();
  });

  it('disables submit when form is invalid', () => {
    const el: HTMLElement = fixture.nativeElement;
    const btn = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('shows required validation when fields are touched and empty', () => {
    component.form.controls.userName.markAsTouched();
    component.form.controls.email.markAsTouched();
    component.form.controls.password.markAsTouched();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const feedbacks = el.querySelectorAll('.invalid-feedback');
    expect(feedbacks.length).toBeGreaterThanOrEqual(3);
  });

  it('shows email format validation', () => {
    component.form.controls.email.setValue('notanemail');
    component.form.controls.email.markAsTouched();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('input[formControlName="email"]')?.classList).toContain('is-invalid');
  });

  it('redirects to /login on successful registration', () => {
    const spy = vi.spyOn(router, 'navigateByUrl');

    component.form.setValue({ userName: 'newuser', email: 'new@test.com', password: 'Password1!' });
    component.onSubmit();

    http.expectOne('/api/auth/register').flush(null);

    expect(spy).toHaveBeenCalledWith('/login');
    expect(notifications.notifications().length).toBe(1);
    expect(notifications.notifications()[0].type).toBe('success');
  });

  it('displays server errors for duplicate email', () => {
    component.form.setValue({
      userName: 'newuser',
      email: 'taken@test.com',
      password: 'Password1!',
    });
    component.onSubmit();

    http.expectOne('/api/auth/register').flush({
      success: false,
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'One or more validation errors occurred.',
        details: { DuplicateEmail: ['Email "taken@test.com" is already taken.'] },
      },
      traceId: '',
      timestampUtc: '',
    });

    fixture.detectChanges();

    expect(component.serverErrors().length).toBeGreaterThan(0);
    expect(component.serverErrors()).toContain('Email "taken@test.com" is already taken.');
  });

  it('displays server errors for password policy', () => {
    component.form.setValue({ userName: 'newuser', email: 'new@test.com', password: '123' });
    component.onSubmit();

    http.expectOne('/api/auth/register').flush({
      success: false,
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'One or more validation errors occurred.',
        details: {
          PasswordTooShort: ['Passwords must be at least 6 characters.'],
          PasswordRequiresUpper: ['Passwords must have at least one uppercase letter.'],
        },
      },
      traceId: '',
      timestampUtc: '',
    });

    fixture.detectChanges();

    expect(component.serverErrors().length).toBe(2);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.alert-danger')).toBeTruthy();
  });

  it('disables submit button during loading', () => {
    component.form.setValue({ userName: 'newuser', email: 'new@test.com', password: 'Password1!' });
    component.onSubmit();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const btn = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(component.submitting()).toBe(true);

    http.expectOne('/api/auth/register').flush(null);

    expect(component.submitting()).toBe(false);
  });
});
