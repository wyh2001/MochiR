import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SubjectService } from './subject.service';
import { apiResponseInterceptor } from '../interceptors/api-response.interceptor';

describe('SubjectService', () => {
  let service: SubjectService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(SubjectService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getAll', () => {
    it('fetches all subjects', () => {
      const mockData = [{ id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 }];

      service.getAll().subscribe((data) => {
        expect(data).toEqual(mockData);
      });

      http.expectOne('/api/subjects').flush({
        success: true,
        data: mockData,
        error: null,
        traceId: '',
        timestampUtc: '',
      });
    });

    it('fetches subjects filtered by subjectTypeId', () => {
      service.getAll(2).subscribe();

      const req = http.expectOne('/api/subjects?subjectTypeId=2');
      expect(req.request.method).toBe('GET');
      req.flush({
        success: true,
        data: [],
        error: null,
        traceId: '',
        timestampUtc: '',
      });
    });

    it('throws on server error', () => {
      service.getAll().subscribe({
        error: (err) => {
          expect(err.code).toBe('INTERNAL_ERROR');
        },
      });

      http.expectOne('/api/subjects').flush({
        success: false,
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', details: null },
        traceId: '',
        timestampUtc: '',
      });
    });
  });

  describe('getById', () => {
    it('fetches subject by id', () => {
      const mockDetail = {
        id: 1,
        name: 'Inception',
        slug: 'inception',
        subjectTypeId: 1,
        subjectTypeKey: 'movie',
        subjectTypeDisplayName: 'Movie',
        attributes: [{ key: 'director', value: 'Christopher Nolan', note: null }],
        createdAt: '2026-01-15T10:30:00Z',
      };

      service.getById(1).subscribe((data) => {
        expect(data).toEqual(mockDetail);
      });

      http.expectOne('/api/subjects/1').flush({
        success: true,
        data: mockDetail,
        error: null,
        traceId: '',
        timestampUtc: '',
      });
    });

    it('throws on not found', () => {
      service.getById(999).subscribe({
        error: (err) => {
          expect(err.code).toBe('SUBJECT_NOT_FOUND');
        },
      });

      http.expectOne('/api/subjects/999').flush({
        success: false,
        data: null,
        error: { code: 'SUBJECT_NOT_FOUND', message: 'Subject not found', details: null },
        traceId: '',
        timestampUtc: '',
      });
    });
  });

  describe('create', () => {
    it('sends POST with correct payload', () => {
      const dto = {
        name: 'Inception',
        slug: 'inception',
        subjectTypeId: 1,
        attributes: [{ key: 'director', value: 'Christopher Nolan', note: null }],
      };

      service.create(dto).subscribe();

      const req = http.expectOne('/api/subjects');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush({
        success: true,
        data: { id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 },
        error: null,
        traceId: '',
        timestampUtc: '',
      });
    });

    it('throws on duplicate slug', () => {
      service
        .create({ name: 'Inception', slug: 'inception', subjectTypeId: 1, attributes: null })
        .subscribe({
          error: (err) => {
            expect(err.code).toBe('SUBJECT_DUPLICATE_SLUG');
          },
        });

      http.expectOne('/api/subjects').flush({
        success: false,
        data: null,
        error: {
          code: 'SUBJECT_DUPLICATE_SLUG',
          message: 'A subject with this slug already exists',
          details: null,
        },
        traceId: '',
        timestampUtc: '',
      });
    });

    it('throws on subject type not found', () => {
      service
        .create({ name: 'Inception', slug: 'inception', subjectTypeId: 999, attributes: null })
        .subscribe({
          error: (err) => {
            expect(err.code).toBe('SUBJECT_SUBJECT_TYPE_NOT_FOUND');
          },
        });

      http.expectOne('/api/subjects').flush({
        success: false,
        data: null,
        error: {
          code: 'SUBJECT_SUBJECT_TYPE_NOT_FOUND',
          message: 'Subject type not found',
          details: null,
        },
        traceId: '',
        timestampUtc: '',
      });
    });
  });

  describe('update', () => {
    it('sends PUT with correct payload', () => {
      const dto = {
        name: 'Inception (Updated)',
        slug: 'inception',
        subjectTypeId: 1,
        attributes: [{ key: 'director', value: 'Christopher Nolan', note: 'Also producer' }],
      };

      service.update(1, dto).subscribe();

      const req = http.expectOne('/api/subjects/1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      req.flush({
        success: true,
        data: { id: 1, name: 'Inception (Updated)', slug: 'inception', subjectTypeId: 1 },
        error: null,
        traceId: '',
        timestampUtc: '',
      });
    });

    it('throws on duplicate slug during update', () => {
      service
        .update(1, {
          name: 'Inception',
          slug: 'dune',
          subjectTypeId: 1,
          attributes: null,
        })
        .subscribe({
          error: (err) => {
            expect(err.code).toBe('SUBJECT_DUPLICATE_SLUG');
          },
        });

      http.expectOne('/api/subjects/1').flush({
        success: false,
        data: null,
        error: {
          code: 'SUBJECT_DUPLICATE_SLUG',
          message: 'A subject with this slug already exists',
          details: null,
        },
        traceId: '',
        timestampUtc: '',
      });
    });
  });

  describe('delete', () => {
    it('sends DELETE and returns result', () => {
      service.delete(1).subscribe((result) => {
        expect(result).toEqual({ id: 1, deleted: true });
      });

      const req = http.expectOne('/api/subjects/1');
      expect(req.request.method).toBe('DELETE');
      req.flush({
        success: true,
        data: { id: 1, deleted: true },
        error: null,
        traceId: '',
        timestampUtc: '',
      });
    });

    it('throws on delete error', () => {
      service.delete(999).subscribe({
        error: (err) => {
          expect(err.code).toBe('SUBJECT_NOT_FOUND');
        },
      });

      http.expectOne('/api/subjects/999').flush({
        success: false,
        data: null,
        error: { code: 'SUBJECT_NOT_FOUND', message: 'Subject not found', details: null },
        traceId: '',
        timestampUtc: '',
      });
    });
  });
});
