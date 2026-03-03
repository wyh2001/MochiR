import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AdminUserForm } from './user-form';
import { apiResponseInterceptor } from '../../../../core/interceptors/api-response.interceptor';
import { NotificationService } from '../../../../core/services/notification.service';

describe('AdminUserForm', () => {
  let fixture: ComponentFixture<AdminUserForm>;
  let http: HttpTestingController;

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

  const mockUser = {
    public: {
      id: 'user-1',
      userName: 'alice',
      displayName: 'Alice',
      avatarUrl: null,
      createdAtUtc: '2026-01-15T12:00:00Z',
    },
    sensitive: {
      email: 'alice@test.com',
      emailConfirmed: true,
      phoneNumber: null,
      phoneNumberConfirmed: false,
      twoFactorEnabled: false,
      lockoutEnabled: true,
      lockoutEnd: null,
      roles: ['Admin'],
    },
  };

  function createComponent(editId?: string) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AdminUserForm],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of(editId ? { id: editId } : {}),
            snapshot: { params: editId ? { id: editId } : {} },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(AdminUserForm);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => http.verify());

  describe('create mode', () => {
    it('shows create form with required fields', () => {
      createComponent();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Create User');
      expect(el.querySelector('#userName')).toBeTruthy();
      expect(el.querySelector('#email')).toBeTruthy();
      expect(el.querySelector('#password')).toBeTruthy();
    });

    it('disables submit when form is invalid', () => {
      createComponent();
      fixture.detectChanges();

      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-submit');
      expect(btn.disabled).toBe(true);
    });

    it('submits create form and navigates to user detail', () => {
      createComponent();
      fixture.detectChanges();

      fixture.componentInstance.createForm.patchValue({
        userName: 'bob',
        email: 'bob@test.com',
        password: 'pass123',
      });
      fixture.detectChanges();

      fixture.componentInstance.onSubmit();

      const req = http.expectOne('/api/users');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.userName).toBe('bob');
      expect(req.request.body.email).toBe('bob@test.com');
      req.flush(envelope(mockUser));

      const notification = TestBed.inject(NotificationService);
      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].type).toBe('success');
    });

    it('shows server error on create failure', () => {
      createComponent();
      fixture.detectChanges();

      fixture.componentInstance.createForm.patchValue({
        userName: 'bob',
        email: 'bob@test.com',
        password: 'pass',
      });
      fixture.componentInstance.onSubmit();

      http.expectOne('/api/users').flush(errorEnvelope('VALIDATION_ERROR', 'Username taken'));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Username taken');
    });
  });

  describe('edit mode', () => {
    it('shows edit form and loads existing user data', () => {
      createComponent('user-1');
      fixture.detectChanges();

      http.expectOne('/api/users/user-1').flush(envelope(mockUser));
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Edit User');
      expect(fixture.componentInstance.editForm.value.displayName).toBe('Alice');
      expect(fixture.componentInstance.editForm.value.email).toBe('alice@test.com');
    });

    it('submits edit form with PATCH request', () => {
      createComponent('user-1');
      fixture.detectChanges();

      http.expectOne('/api/users/user-1').flush(envelope(mockUser));
      fixture.detectChanges();

      fixture.componentInstance.editForm.patchValue({ displayName: 'Alice Updated' });
      fixture.componentInstance.onSubmit();

      const req = http.expectOne('/api/users/user-1');
      expect(req.request.method).toBe('PATCH');
      req.flush(envelope(mockUser));

      const notification = TestBed.inject(NotificationService);
      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].message).toContain('updated');
    });

    it('shows server error on edit failure', () => {
      createComponent('user-1');
      fixture.detectChanges();

      http.expectOne('/api/users/user-1').flush(envelope(mockUser));
      fixture.detectChanges();

      fixture.componentInstance.onSubmit();

      http.expectOne('/api/users/user-1').flush(errorEnvelope('UPDATE_FAILED', 'Cannot update'));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Cannot update');
    });

    it('shows error when user load fails', () => {
      createComponent('user-1');
      fixture.detectChanges();

      http.expectOne('/api/users/user-1').flush(errorEnvelope('USER_NOT_FOUND', 'User not found'));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('User not found');
    });
  });
});
