import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SubjectTypeService } from './subject-type.service';
import { apiResponseInterceptor } from '../interceptors/api-response.interceptor';

describe('SubjectTypeService', () => {
  let service: SubjectTypeService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(SubjectTypeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getAll', () => {
    it('returns subject types from GET /api/subject-types', () => {
      const mockData = [
        { id: 1, key: 'movie', displayName: 'Movie' },
        { id: 2, key: 'book', displayName: 'Book' },
      ];

      let result: unknown;
      service.getAll().subscribe((data) => (result = data));

      http.expectOne('/api/subject-types').flush({
        success: true,
        data: mockData,
        error: null,
        traceId: '',
        timestampUtc: '',
      });

      expect(result).toEqual(mockData);
    });

    it('throws error on API failure', () => {
      let error: unknown;
      service.getAll().subscribe({ error: (err) => (error = err) });

      http.expectOne('/api/subject-types').flush({
        success: false,
        data: null,
        error: { code: 'ERROR', message: 'Failed to load', details: null },
        traceId: '',
        timestampUtc: '',
      });

      expect(error).toEqual({ code: 'ERROR', message: 'Failed to load', details: null });
    });
  });

  describe('create', () => {
    it('sends POST /api/subject-types with DTO and returns result', () => {
      const dto = { key: 'movie', displayName: 'Movie', settings: null };
      const response = { id: 1, key: 'movie', displayName: 'Movie' };

      let result: unknown;
      service.create(dto).subscribe((data) => (result = data));

      const req = http.expectOne('/api/subject-types');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush({ success: true, data: response, error: null, traceId: '', timestampUtc: '' });

      expect(result).toEqual(response);
    });

    it('throws server error on duplicate key', () => {
      const dto = { key: 'movie', displayName: 'Movie', settings: null };

      let error: unknown;
      service.create(dto).subscribe({ error: (err) => (error = err) });

      http.expectOne('/api/subject-types').flush({
        success: false,
        data: null,
        error: { code: 'DUPLICATE_KEY', message: 'Key already exists', details: null },
        traceId: '',
        timestampUtc: '',
      });

      expect(error).toEqual({
        code: 'DUPLICATE_KEY',
        message: 'Key already exists',
        details: null,
      });
    });
  });

  describe('update', () => {
    it('sends PUT /api/subject-types/{id} with DTO and returns result', () => {
      const dto = { key: 'movie', displayName: 'Movies', settings: null };
      const response = { id: 1, key: 'movie', displayName: 'Movies' };

      let result: unknown;
      service.update(1, dto).subscribe((data) => (result = data));

      const req = http.expectOne('/api/subject-types/1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      req.flush({ success: true, data: response, error: null, traceId: '', timestampUtc: '' });

      expect(result).toEqual(response);
    });
  });

  describe('delete', () => {
    it('sends DELETE /api/subject-types/{id} and returns result', () => {
      const response = { id: 1, deleted: true };

      let result: unknown;
      service.delete(1).subscribe((data) => (result = data));

      const req = http.expectOne('/api/subject-types/1');
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true, data: response, error: null, traceId: '', timestampUtc: '' });

      expect(result).toEqual(response);
    });

    it('throws error on delete failure', () => {
      let error: unknown;
      service.delete(1).subscribe({ error: (err) => (error = err) });

      http.expectOne('/api/subject-types/1').flush({
        success: false,
        data: null,
        error: { code: 'DELETE_FAILED', message: 'Cannot delete', details: null },
        traceId: '',
        timestampUtc: '',
      });

      expect(error).toEqual({
        code: 'DELETE_FAILED',
        message: 'Cannot delete',
        details: null,
      });
    });
  });
});
