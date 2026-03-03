import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CriteriaTemplateService } from './criteria-template.service';
import { apiResponseInterceptor } from '../interceptors/api-response.interceptor';

describe('CriteriaTemplateService', () => {
  let service: CriteriaTemplateService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CriteriaTemplateService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getAll', () => {
    it('returns criteria templates list', () => {
      const mockData = [
        { id: 1, subjectTypeId: 1, key: 'acting', displayName: 'Acting', isRequired: true },
        { id: 2, subjectTypeId: 1, key: 'plot', displayName: 'Plot', isRequired: false },
      ];

      service.getAll().subscribe((result) => {
        expect(result).toEqual(mockData);
      });

      const req = http.expectOne('/api/criteria-templates');
      expect(req.request.method).toBe('GET');
      req.flush({
        success: true,
        data: mockData,
        error: null,
        traceId: '',
        timestampUtc: '',
      });
    });

    it('passes subjectTypeId query parameter when provided', () => {
      service.getAll(1).subscribe();

      const req = http.expectOne('/api/criteria-templates?subjectTypeId=1');
      expect(req.request.method).toBe('GET');
      req.flush({
        success: true,
        data: [],
        error: null,
        traceId: '',
        timestampUtc: '',
      });
    });

    it('throws error on API failure', () => {
      service.getAll().subscribe({
        error: (err) => {
          expect(err.code).toBe('INTERNAL_ERROR');
          expect(err.message).toBe('Server error');
        },
      });

      http.expectOne('/api/criteria-templates').flush({
        success: false,
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'Server error', details: null },
        traceId: '',
        timestampUtc: '',
      });
    });
  });

  describe('getById', () => {
    it('returns criteria template detail', () => {
      const mockData = {
        id: 1,
        subjectTypeId: 1,
        subjectTypeKey: 'movie',
        subjectTypeDisplayName: 'Movie',
        key: 'acting',
        displayName: 'Acting',
        isRequired: true,
      };

      service.getById(1).subscribe((result) => {
        expect(result).toEqual(mockData);
      });

      const req = http.expectOne('/api/criteria-templates/1');
      expect(req.request.method).toBe('GET');
      req.flush({
        success: true,
        data: mockData,
        error: null,
        traceId: '',
        timestampUtc: '',
      });
    });

    it('throws error when template not found', () => {
      service.getById(999).subscribe({
        error: (err) => {
          expect(err.code).toBe('CRITERIA_TEMPLATE_NOT_FOUND');
        },
      });

      http.expectOne('/api/criteria-templates/999').flush({
        success: false,
        data: null,
        error: {
          code: 'CRITERIA_TEMPLATE_NOT_FOUND',
          message: 'Criteria template not found',
          details: null,
        },
        traceId: '',
        timestampUtc: '',
      });
    });
  });

  describe('create', () => {
    it('creates a criteria template successfully', () => {
      const dto = { subjectTypeId: 1, key: 'acting', displayName: 'Acting', isRequired: true };
      const mockResponse = { id: 1, ...dto };

      service.create(dto).subscribe((result) => {
        expect(result).toEqual(mockResponse);
      });

      const req = http.expectOne('/api/criteria-templates');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush({
        success: true,
        data: mockResponse,
        error: null,
        traceId: '',
        timestampUtc: '',
      });
    });

    it('throws error on duplicate key', () => {
      const dto = { subjectTypeId: 1, key: 'acting', displayName: 'Acting', isRequired: true };

      service.create(dto).subscribe({
        error: (err) => {
          expect(err.code).toBe('CRITERIA_TEMPLATE_DUPLICATE_KEY');
        },
      });

      http.expectOne('/api/criteria-templates').flush({
        success: false,
        data: null,
        error: {
          code: 'CRITERIA_TEMPLATE_DUPLICATE_KEY',
          message: 'Key already exists for this subject type',
          details: null,
        },
        traceId: '',
        timestampUtc: '',
      });
    });

    it('throws error when subject type not found', () => {
      const dto = {
        subjectTypeId: 999,
        key: 'acting',
        displayName: 'Acting',
        isRequired: true,
      };

      service.create(dto).subscribe({
        error: (err) => {
          expect(err.code).toBe('CRITERIA_TEMPLATE_SUBJECT_TYPE_NOT_FOUND');
        },
      });

      http.expectOne('/api/criteria-templates').flush({
        success: false,
        data: null,
        error: {
          code: 'CRITERIA_TEMPLATE_SUBJECT_TYPE_NOT_FOUND',
          message: 'Subject type not found',
          details: null,
        },
        traceId: '',
        timestampUtc: '',
      });
    });
  });
});
