import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Login } from './login';
import { apiResponseInterceptor } from '../../../core/interceptors/api-response.interceptor';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let component: Login;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([{ path: '', children: [] }]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('renders the login form', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('form')).toBeTruthy();
    expect(el.querySelector('input[formControlName="userNameOrEmail"]')).toBeTruthy();
    expect(el.querySelector('input[formControlName="password"]')).toBeTruthy();
    expect(el.querySelector('button[type="submit"]')).toBeTruthy();
  });

  it('disables submit when form is invalid', () => {
    const el: HTMLElement = fixture.nativeElement;
    const btn = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('enables submit when form is valid', () => {
    component.form.setValue({ userNameOrEmail: 'testuser', password: 'password123' });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const btn = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('shows required validation when fields are touched and empty', () => {
    component.form.controls.userNameOrEmail.markAsTouched();
    component.form.controls.password.markAsTouched();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const feedbacks = el.querySelectorAll('.invalid-feedback');
    expect(feedbacks.length).toBeGreaterThanOrEqual(2);
  });

  it('redirects to / on successful login', () => {
    const spy = vi.spyOn(router, 'navigateByUrl');

    component.form.setValue({ userNameOrEmail: 'testuser', password: 'password123' });
    component.onSubmit();

    http.expectOne('/api/auth/login').flush(null);

    // Profile fetch after login
    http.expectOne('/api/me').flush({
      id: '1',
      userName: 'testuser',
      displayName: 'Test',
      email: 'test@test.com',
      emailConfirmed: true,
      phoneNumber: null,
      phoneNumberConfirmed: false,
      avatarUrl: null,
      twoFactorEnabled: false,
      lockoutEnabled: true,
      lockoutEnd: null,
      createdAtUtc: '2026-01-01T00:00:00Z',
      followersCount: 0,
      followingCount: 0,
    });

    expect(spy).toHaveBeenCalledWith('/');
  });

  it('displays server error for invalid credentials', () => {
    component.form.setValue({ userNameOrEmail: 'testuser', password: 'wrong' });
    component.onSubmit();

    http.expectOne('/api/auth/login').flush({
      success: false,
      data: null,
      error: {
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid username or password.',
        details: null,
      },
      traceId: '',
      timestampUtc: '',
    });

    fixture.detectChanges();

    expect(component.serverError()).toBe('Invalid username or password.');
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.alert-danger')?.textContent).toContain(
      'Invalid username or password.',
    );
  });

  it('displays error for locked account', () => {
    component.form.setValue({ userNameOrEmail: 'locked', password: 'password123' });
    component.onSubmit();

    http.expectOne('/api/auth/login').flush({
      success: false,
      data: null,
      error: {
        code: 'AUTH_ACCOUNT_LOCKED',
        message: 'Account is locked. Please try again later.',
        details: null,
      },
      traceId: '',
      timestampUtc: '',
    });

    fixture.detectChanges();

    expect(component.serverError()).toBe('Account is locked. Please try again later.');
  });

  it('disables submit button during loading', () => {
    component.form.setValue({ userNameOrEmail: 'testuser', password: 'password123' });
    component.onSubmit();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const btn = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(component.submitting()).toBe(true);

    http.expectOne('/api/auth/login').flush(null);

    http.expectOne('/api/me').flush({
      id: '1',
      userName: 'testuser',
      displayName: 'Test',
      email: 'test@test.com',
      emailConfirmed: true,
      phoneNumber: null,
      phoneNumberConfirmed: false,
      avatarUrl: null,
      twoFactorEnabled: false,
      lockoutEnabled: true,
      lockoutEnd: null,
      createdAtUtc: '2026-01-01T00:00:00Z',
      followersCount: 0,
      followingCount: 0,
    });

    expect(component.submitting()).toBe(false);
  });
});
