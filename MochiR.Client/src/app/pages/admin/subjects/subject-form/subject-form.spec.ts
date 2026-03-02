import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { SubjectForm } from './subject-form';
import { apiResponseInterceptor } from '../../../../core/interceptors/api-response.interceptor';
import { NotificationService } from '../../../../core/services/notification.service';

describe('SubjectForm', () => {
  let fixture: ComponentFixture<SubjectForm>;
  let http: HttpTestingController;
  let notification: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectForm],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubjectForm);
    http = TestBed.inject(HttpTestingController);
    notification = TestBed.inject(NotificationService);
  });

  afterEach(() => http.verify());

  function flushSubjectTypes(data: unknown[] = [{ id: 1, key: 'movie', displayName: 'Movie' }]) {
    http.expectOne('/api/subject-types').flush({
      success: true,
      data,
      error: null,
      traceId: '',
      timestampUtc: '',
    });
    fixture.detectChanges();
  }

  function initCreateForm(subjectTypes?: unknown[]) {
    fixture.detectChanges();
    flushSubjectTypes(subjectTypes);
  }

  describe('create mode', () => {
    it('renders form with subject type dropdown, name, slug, and attributes editor', () => {
      initCreateForm();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('select[formControlName="subjectTypeId"]')).toBeTruthy();
      expect(el.querySelector('input[formControlName="name"]')).toBeTruthy();
      expect(el.querySelector('input[formControlName="slug"]')).toBeTruthy();
      expect(el.querySelector('app-attributes-editor')).toBeTruthy();
    });

    it('loads subject types into dropdown', () => {
      initCreateForm([
        { id: 1, key: 'movie', displayName: 'Movie' },
        { id: 2, key: 'book', displayName: 'Book' },
      ]);

      const options = fixture.nativeElement.querySelectorAll(
        'select[formControlName="subjectTypeId"] option',
      );
      expect(options.length).toBe(3);
      expect(options[1].textContent).toContain('Movie');
      expect(options[2].textContent).toContain('Book');
    });

    it('prevents submission when required fields empty', () => {
      initCreateForm();

      const component = fixture.componentInstance;
      component.onSubmit();
      expect(http.match('/api/subjects').length).toBe(0);
    });

    it('shows validation errors for touched empty fields', () => {
      initCreateForm();

      const component = fixture.componentInstance;
      component.form.get('name')!.markAsTouched();
      component.form.get('slug')!.markAsTouched();
      component.form.get('subjectTypeId')!.markAsTouched();
      fixture.detectChanges();

      const errors = fixture.nativeElement.querySelectorAll('.invalid-feedback');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('adds and removes attribute rows', () => {
      initCreateForm();

      const addBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-add-attribute');
      addBtn.click();
      fixture.detectChanges();

      const component = fixture.componentInstance;
      expect(component.attributes.length).toBe(1);
      expect(fixture.nativeElement.querySelectorAll('.attribute-row').length).toBe(1);

      addBtn.click();
      fixture.detectChanges();
      expect(component.attributes.length).toBe(2);
    });

    it('submits POST request with correct payload including attributes', () => {
      initCreateForm();

      const component = fixture.componentInstance;
      component.form.patchValue({
        subjectTypeId: 1,
        name: 'Inception',
        slug: 'inception',
      });

      const addBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-add-attribute');
      addBtn.click();
      fixture.detectChanges();

      component.attributes.at(0).patchValue({
        key: 'director',
        value: 'Christopher Nolan',
        note: '',
      });

      component.onSubmit();

      const req = http.expectOne('/api/subjects');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        subjectTypeId: 1,
        name: 'Inception',
        slug: 'inception',
        attributes: [{ key: 'director', value: 'Christopher Nolan', note: null }],
      });

      req.flush({
        success: true,
        data: { id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 },
        error: null,
        traceId: '',
        timestampUtc: '',
      });
    });

    it('shows success notification on create', () => {
      initCreateForm();

      const component = fixture.componentInstance;
      component.form.patchValue({
        subjectTypeId: 1,
        name: 'Inception',
        slug: 'inception',
      });

      component.onSubmit();

      http.expectOne('/api/subjects').flush({
        success: true,
        data: { id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 },
        error: null,
        traceId: '',
        timestampUtc: '',
      });

      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].type).toBe('success');
    });

    it('disables submit button while submitting', () => {
      initCreateForm();

      const component = fixture.componentInstance;
      component.form.patchValue({
        subjectTypeId: 1,
        name: 'Inception',
        slug: 'inception',
      });

      component.onSubmit();
      fixture.detectChanges();

      expect(component.submitting()).toBe(true);
      const submitBtn = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(submitBtn.disabled).toBe(true);

      http.expectOne('/api/subjects').flush({
        success: true,
        data: { id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 },
        error: null,
        traceId: '',
        timestampUtc: '',
      });
    });

    it('displays server error on duplicate slug', () => {
      initCreateForm();

      const component = fixture.componentInstance;
      component.form.patchValue({
        subjectTypeId: 1,
        name: 'Inception',
        slug: 'inception',
      });

      component.onSubmit();

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
      fixture.detectChanges();

      expect(component.serverError()).toBe('A subject with this slug already exists');
      const alert = fixture.nativeElement.querySelector('.alert-danger');
      expect(alert?.textContent).toContain('slug already exists');
    });

    it('displays server error on subject type not found', () => {
      initCreateForm();

      const component = fixture.componentInstance;
      component.form.patchValue({
        subjectTypeId: 999,
        name: 'Inception',
        slug: 'inception',
      });

      component.onSubmit();

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
      fixture.detectChanges();

      expect(component.serverError()).toBe('Subject type not found');
    });

    it('Cancel link navigates to list', () => {
      initCreateForm();

      const cancelLink = fixture.nativeElement.querySelector('a[href="/subjects"]');
      expect(cancelLink).toBeTruthy();
      expect(cancelLink.textContent).toContain('Cancel');
    });
  });
});

describe('SubjectForm (edit mode)', () => {
  let fixture: ComponentFixture<SubjectForm>;
  let http: HttpTestingController;
  let notification: NotificationService;

  const mockDetail = {
    id: 1,
    name: 'Inception',
    slug: 'inception',
    subjectTypeId: 1,
    subjectTypeKey: 'movie',
    subjectTypeDisplayName: 'Movie',
    attributes: [
      { key: 'director', value: 'Christopher Nolan', note: 'Also producer' },
      { key: 'year', value: '2010', note: null },
    ],
    createdAt: '2026-01-15T10:30:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectForm],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: '1' }),
            snapshot: { params: { id: '1' } },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubjectForm);
    http = TestBed.inject(HttpTestingController);
    notification = TestBed.inject(NotificationService);
  });

  afterEach(() => http.verify());

  function flushSubjectTypes(data: unknown[] = [{ id: 1, key: 'movie', displayName: 'Movie' }]) {
    http.expectOne('/api/subject-types').flush({
      success: true,
      data,
      error: null,
      traceId: '',
      timestampUtc: '',
    });
  }

  function flushDetail(data: unknown = mockDetail) {
    http.expectOne('/api/subjects/1').flush({
      success: true,
      data,
      error: null,
      traceId: '',
      timestampUtc: '',
    });
  }

  function initEditForm() {
    fixture.detectChanges();
    flushSubjectTypes();
    flushDetail();
    fixture.detectChanges();
  }

  it('detects edit mode from route param', () => {
    initEditForm();

    const component = fixture.componentInstance;
    expect(component.isEditMode()).toBe(true);
  });

  it('pre-fills form with subject data', () => {
    initEditForm();

    const component = fixture.componentInstance;
    expect(component.form.getRawValue().name).toBe('Inception');
    expect(component.form.getRawValue().slug).toBe('inception');
    expect(component.form.getRawValue().subjectTypeId).toBe(1);
  });

  it('pre-fills attributes from subject detail', () => {
    initEditForm();

    const component = fixture.componentInstance;
    expect(component.attributes.length).toBe(2);
    expect(component.attributes.at(0).get('key')!.value).toBe('director');
    expect(component.attributes.at(0).get('value')!.value).toBe('Christopher Nolan');
    expect(component.attributes.at(0).get('note')!.value).toBe('Also producer');
    expect(component.attributes.at(1).get('key')!.value).toBe('year');
  });

  it('sends PUT request on submit', () => {
    initEditForm();

    const component = fixture.componentInstance;
    component.form.patchValue({ name: 'Inception (Updated)' });
    component.onSubmit();

    const req = http.expectOne('/api/subjects/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.name).toBe('Inception (Updated)');
    expect(req.request.body.attributes.length).toBe(2);

    req.flush({
      success: true,
      data: { id: 1, name: 'Inception (Updated)', slug: 'inception', subjectTypeId: 1 },
      error: null,
      traceId: '',
      timestampUtc: '',
    });
  });

  it('shows success notification on update', () => {
    initEditForm();

    const component = fixture.componentInstance;
    component.onSubmit();

    http.expectOne('/api/subjects/1').flush({
      success: true,
      data: { id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 },
      error: null,
      traceId: '',
      timestampUtc: '',
    });

    expect(notification.notifications().length).toBe(1);
    expect(notification.notifications()[0].type).toBe('success');
    expect(notification.notifications()[0].message).toContain('updated');
  });

  it('displays server error on duplicate slug during update', () => {
    initEditForm();

    const component = fixture.componentInstance;
    component.form.patchValue({ slug: 'dune' });
    component.onSubmit();

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
    fixture.detectChanges();

    expect(component.serverError()).toBe('A subject with this slug already exists');
  });

  it('Cancel link navigates to detail page', () => {
    initEditForm();

    const cancelLink = fixture.nativeElement.querySelector('a[href="/subjects/1"]');
    expect(cancelLink).toBeTruthy();
    expect(cancelLink.textContent).toContain('Cancel');
  });

  it('shows Edit title', () => {
    initEditForm();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Edit Subject');
  });
});
