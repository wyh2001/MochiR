import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminUserService } from './admin-user.service';
import { apiResponseInterceptor } from '../interceptors/api-response.interceptor';

describe('AdminUserService', () => {
  let service: AdminUserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AdminUserService);
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

  const mockPage = {
    totalCount: 1,
    page: 1,
    pageSize: 50,
    items: [
      {
        id: 'user-1',
        userName: 'alice',
        displayName: 'Alice',
        avatarUrl: null,
        createdAtUtc: '2026-01-15T12:00:00Z',
      },
    ],
  };

  describe('getAll', () => {
    it('fetches users via GET /api/users with query params', () => {
      service.getAll({ query: 'alice', page: 1, pageSize: 50 }).subscribe((data) => {
        expect(data).toEqual(mockPage);
      });

      const req = http.expectOne('/api/users?query=alice&page=1&pageSize=50');
      expect(req.request.method).toBe('GET');
      req.flush(envelope(mockPage));
    });

    it('sends request without params when none provided', () => {
      service.getAll().subscribe();

      const req = http.expectOne('/api/users');
      expect(req.request.method).toBe('GET');
      req.flush(envelope(mockPage));
    });

    it('propagates error on failure', () => {
      let error: unknown;
      service.getAll().subscribe({ error: (e) => (error = e) });

      http.expectOne('/api/users').flush(errorEnvelope('UNAUTHORIZED', 'Not authorized'));

      expect(error).toEqual({ code: 'UNAUTHORIZED', message: 'Not authorized', details: null });
    });
  });

  describe('getById', () => {
    it('fetches user via GET /api/users/{id}', () => {
      service.getById('user-1').subscribe((data) => {
        expect(data).toEqual(mockUser);
      });

      const req = http.expectOne('/api/users/user-1');
      expect(req.request.method).toBe('GET');
      req.flush(envelope(mockUser));
    });

    it('propagates error on failure', () => {
      let error: unknown;
      service.getById('nonexistent').subscribe({ error: (e) => (error = e) });

      http
        .expectOne('/api/users/nonexistent')
        .flush(errorEnvelope('USER_NOT_FOUND', 'User not found'));

      expect(error).toEqual({ code: 'USER_NOT_FOUND', message: 'User not found', details: null });
    });
  });

  describe('create', () => {
    it('sends POST /api/users with body', () => {
      const dto = { userName: 'bob', email: 'bob@test.com', password: 'pass123' };
      service.create(dto).subscribe((data) => {
        expect(data).toEqual(mockUser);
      });

      const req = http.expectOne('/api/users');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(envelope(mockUser));
    });

    it('propagates error on failure', () => {
      let error: unknown;
      service
        .create({ userName: 'bob', email: 'bob@test.com', password: 'pass' })
        .subscribe({ error: (e) => (error = e) });

      http.expectOne('/api/users').flush(errorEnvelope('VALIDATION_ERROR', 'Invalid data'));

      expect(error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Invalid data',
        details: null,
      });
    });
  });

  describe('update', () => {
    it('sends PATCH /api/users/{id} with body', () => {
      const dto = { displayName: { value: 'Alice Updated', hasValue: true } };
      service.update('user-1', dto).subscribe((data) => {
        expect(data).toEqual(mockUser);
      });

      const req = http.expectOne('/api/users/user-1');
      expect(req.request.method).toBe('PATCH');
      req.flush(envelope(mockUser));
    });

    it('propagates error on failure', () => {
      let error: unknown;
      service.update('user-1', {}).subscribe({ error: (e) => (error = e) });

      http
        .expectOne('/api/users/user-1')
        .flush(errorEnvelope('UPDATE_FAILED', 'Cannot update user'));

      expect(error).toEqual({
        code: 'UPDATE_FAILED',
        message: 'Cannot update user',
        details: null,
      });
    });
  });

  describe('lock', () => {
    it('sends POST /api/users/{id}/lock with body', () => {
      const dto = { until: '2026-12-31T23:59:59Z' };
      service.lock('user-1', dto).subscribe((data) => {
        expect(data).toEqual({ userId: 'user-1', lockoutEnd: '2026-12-31T23:59:59Z' });
      });

      const req = http.expectOne('/api/users/user-1/lock');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(envelope({ userId: 'user-1', lockoutEnd: '2026-12-31T23:59:59Z' }));
    });

    it('unlocks a user', () => {
      const dto = { unlock: true };
      service.lock('user-1', dto).subscribe((data) => {
        expect(data).toEqual({ userId: 'user-1', lockoutEnd: null });
      });

      const req = http.expectOne('/api/users/user-1/lock');
      expect(req.request.method).toBe('POST');
      req.flush(envelope({ userId: 'user-1', lockoutEnd: null }));
    });

    it('propagates error on failure', () => {
      let error: unknown;
      service.lock('user-1', {}).subscribe({ error: (e) => (error = e) });

      http
        .expectOne('/api/users/user-1/lock')
        .flush(errorEnvelope('LOCK_FAILED', 'Cannot lock user'));

      expect(error).toEqual({ code: 'LOCK_FAILED', message: 'Cannot lock user', details: null });
    });
  });

  describe('delete', () => {
    it('sends DELETE /api/users/{id}', () => {
      service.delete('user-1').subscribe((data) => {
        expect(data).toEqual({ userId: 'user-1', isDeleted: true });
      });

      const req = http.expectOne('/api/users/user-1');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope({ userId: 'user-1', isDeleted: true }));
    });

    it('propagates error on failure', () => {
      let error: unknown;
      service.delete('user-1').subscribe({ error: (e) => (error = e) });

      http
        .expectOne('/api/users/user-1')
        .flush(errorEnvelope('DELETE_FAILED', 'Cannot delete user'));

      expect(error).toEqual({
        code: 'DELETE_FAILED',
        message: 'Cannot delete user',
        details: null,
      });
    });
  });
});
