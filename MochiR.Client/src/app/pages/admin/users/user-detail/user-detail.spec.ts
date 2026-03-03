import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AdminUserDetail } from './user-detail';
import { apiResponseInterceptor } from '../../../../core/interceptors/api-response.interceptor';
import { NotificationService } from '../../../../core/services/notification.service';

describe('AdminUserDetail', () => {
  let fixture: ComponentFixture<AdminUserDetail>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminUserDetail],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 'user-1' }),
            snapshot: { params: { id: 'user-1' } },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(AdminUserDetail);
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

  function flushUser(data: unknown = mockUser) {
    http.expectOne('/api/users/user-1').flush(envelope(data));
    fixture.detectChanges();
  }

  it('fetches and displays user details', () => {
    fixture.detectChanges();
    flushUser();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Alice');
    expect(el.textContent).toContain('alice');
    expect(el.querySelector('.user-id')?.textContent).toContain('user-1');
  });

  it('displays sensitive info', () => {
    fixture.detectChanges();
    flushUser();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.sensitive-info')).toBeTruthy();
    expect(el.textContent).toContain('alice@test.com');
    expect(el.textContent).toContain('Admin');
  });

  it('shows error on user not found', () => {
    fixture.detectChanges();
    http.expectOne('/api/users/user-1').flush(errorEnvelope('USER_NOT_FOUND', 'User not found'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('User not found');
  });

  it('shows loading state', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading');

    flushUser();
  });

  it('shows Edit, Lock, Delete, and Back buttons', () => {
    fixture.detectChanges();
    flushUser();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('a[href="/admin/users/user-1/edit"]')).toBeTruthy();
    expect(el.querySelector('.btn-lock')).toBeTruthy();
    expect(el.querySelector('.btn-delete')).toBeTruthy();
    expect(el.querySelector('a[href="/admin/users"]')).toBeTruthy();
  });

  it('shows Unlock button when user is locked', () => {
    fixture.detectChanges();
    flushUser({
      ...mockUser,
      sensitive: {
        ...mockUser.sensitive,
        lockoutEnd: '2099-12-31T23:59:59Z',
      },
    });

    expect(fixture.nativeElement.querySelector('.btn-unlock')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.btn-lock')).toBeFalsy();
  });

  it('locks user on click', () => {
    fixture.detectChanges();
    flushUser();

    const lockBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-lock');
    lockBtn.click();

    const req = http.expectOne('/api/users/user-1/lock');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ until: '2099-12-31T23:59:59Z' });
    req.flush(envelope({ userId: 'user-1', lockoutEnd: '2099-12-31T23:59:59Z' }));

    // Reloads user after lock
    http.expectOne('/api/users/user-1').flush(
      envelope({
        ...mockUser,
        sensitive: { ...mockUser.sensitive, lockoutEnd: '2099-12-31T23:59:59Z' },
      }),
    );
    fixture.detectChanges();

    const notification = TestBed.inject(NotificationService);
    expect(notification.notifications().length).toBe(1);
    expect(notification.notifications()[0].message).toContain('locked');
  });

  it('shows confirmation dialog when Delete is clicked', () => {
    fixture.detectChanges();
    flushUser();

    const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
    deleteBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('permanently delete');
    expect(fixture.nativeElement.querySelector('.btn-confirm-delete')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.btn-cancel-delete')).toBeTruthy();
  });

  it('sends DELETE request on confirm', () => {
    fixture.detectChanges();
    flushUser();

    const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
    deleteBtn.click();
    fixture.detectChanges();

    const confirmBtn: HTMLButtonElement =
      fixture.nativeElement.querySelector('.btn-confirm-delete');
    confirmBtn.click();

    const req = http.expectOne('/api/users/user-1');
    expect(req.request.method).toBe('DELETE');
    req.flush(envelope({ userId: 'user-1', isDeleted: true }));

    const notification = TestBed.inject(NotificationService);
    expect(notification.notifications().length).toBe(1);
    expect(notification.notifications()[0].type).toBe('success');
  });

  it('hides confirmation when Cancel is clicked', () => {
    fixture.detectChanges();
    flushUser();

    const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
    deleteBtn.click();
    fixture.detectChanges();

    const cancelBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-cancel-delete');
    cancelBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.btn-confirm-delete')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.btn-delete')).toBeTruthy();
  });
});
