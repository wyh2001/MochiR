import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CriteriaTemplateForm } from './criteria-template-form';
import { apiResponseInterceptor } from '../../../../core/interceptors/api-response.interceptor';
import { NotificationService } from '../../../../core/services/notification.service';

describe('CriteriaTemplateForm', () => {
  let fixture: ComponentFixture<CriteriaTemplateForm>;
  let http: HttpTestingController;
  let notification: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CriteriaTemplateForm],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CriteriaTemplateForm);
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

  function initForm(subjectTypes?: unknown[]) {
    fixture.detectChanges();
    flushSubjectTypes(subjectTypes);
  }

  it('renders form with subject type dropdown, key input, displayName input, isRequired checkbox', () => {
    initForm();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('select[formControlName="subjectTypeId"]')).toBeTruthy();
    expect(el.querySelector('input[formControlName="key"]')).toBeTruthy();
    expect(el.querySelector('input[formControlName="displayName"]')).toBeTruthy();
    expect(el.querySelector('input[type="checkbox"][formControlName="isRequired"]')).toBeTruthy();
  });

  it('loads subject types into dropdown', () => {
    initForm([
      { id: 1, key: 'movie', displayName: 'Movie' },
      { id: 2, key: 'book', displayName: 'Book' },
    ]);

    const options = fixture.nativeElement.querySelectorAll(
      'select[formControlName="subjectTypeId"] option',
    );
    // First option is placeholder, then 2 subject types
    expect(options.length).toBe(3);
    expect(options[1].textContent).toContain('Movie');
    expect(options[2].textContent).toContain('Book');
  });

  it('prevents submission when required fields empty', () => {
    initForm();

    const component = fixture.componentInstance;
    component.onSubmit();
    expect(http.match('/api/criteria-templates').length).toBe(0);
  });

  it('shows validation errors for touched empty fields', () => {
    initForm();

    const component = fixture.componentInstance;
    component.form.get('key')!.markAsTouched();
    component.form.get('displayName')!.markAsTouched();
    component.form.get('subjectTypeId')!.markAsTouched();
    fixture.detectChanges();

    const errors = fixture.nativeElement.querySelectorAll('.invalid-feedback');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('submits POST request with correct payload on success', () => {
    initForm();

    const component = fixture.componentInstance;
    component.form.patchValue({
      subjectTypeId: 1,
      key: 'acting',
      displayName: 'Acting',
      isRequired: true,
    });

    component.onSubmit();

    const req = http.expectOne('/api/criteria-templates');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      subjectTypeId: 1,
      key: 'acting',
      displayName: 'Acting',
      isRequired: true,
    });

    req.flush({
      success: true,
      data: { id: 1, subjectTypeId: 1, key: 'acting', displayName: 'Acting', isRequired: true },
      error: null,
      traceId: '',
      timestampUtc: '',
    });
  });

  it('shows success notification and redirects to list', () => {
    initForm();

    const component = fixture.componentInstance;
    component.form.patchValue({
      subjectTypeId: 1,
      key: 'acting',
      displayName: 'Acting',
      isRequired: false,
    });

    component.onSubmit();

    http.expectOne('/api/criteria-templates').flush({
      success: true,
      data: { id: 1, subjectTypeId: 1, key: 'acting', displayName: 'Acting', isRequired: false },
      error: null,
      traceId: '',
      timestampUtc: '',
    });

    expect(notification.notifications().length).toBe(1);
    expect(notification.notifications()[0].type).toBe('success');
  });

  it('disables submit button while submitting', () => {
    initForm();

    const component = fixture.componentInstance;
    component.form.patchValue({
      subjectTypeId: 1,
      key: 'acting',
      displayName: 'Acting',
      isRequired: false,
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(component.submitting()).toBe(true);
    const submitBtn = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(submitBtn.disabled).toBe(true);

    http.expectOne('/api/criteria-templates').flush({
      success: true,
      data: { id: 1, subjectTypeId: 1, key: 'acting', displayName: 'Acting', isRequired: false },
      error: null,
      traceId: '',
      timestampUtc: '',
    });
  });

  it('displays server error on duplicate key', () => {
    initForm();

    const component = fixture.componentInstance;
    component.form.patchValue({
      subjectTypeId: 1,
      key: 'acting',
      displayName: 'Acting',
      isRequired: false,
    });

    component.onSubmit();

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
    fixture.detectChanges();

    expect(component.serverError()).toBe('Key already exists for this subject type');
    const alert = fixture.nativeElement.querySelector('.alert-danger');
    expect(alert?.textContent).toContain('Key already exists');
  });

  it('displays server error on subject type not found', () => {
    initForm();

    const component = fixture.componentInstance;
    component.form.patchValue({
      subjectTypeId: 999,
      key: 'acting',
      displayName: 'Acting',
      isRequired: false,
    });

    component.onSubmit();

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
    fixture.detectChanges();

    expect(component.serverError()).toBe('Subject type not found');
  });

  it('Cancel link navigates to list', () => {
    initForm();

    const cancelLink = fixture.nativeElement.querySelector('a[href="/criteria-templates"]');
    expect(cancelLink).toBeTruthy();
    expect(cancelLink.textContent).toContain('Cancel');
  });
});
