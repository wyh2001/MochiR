import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { SubjectTypeForm } from './subject-type-form';
import { apiResponseInterceptor } from '../../../../core/interceptors/api-response.interceptor';
import { NotificationService } from '../../../../core/services/notification.service';

describe('SubjectTypeForm', () => {
  describe('create mode', () => {
    let fixture: ComponentFixture<SubjectTypeForm>;
    let http: HttpTestingController;
    let notification: NotificationService;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [SubjectTypeForm],
        providers: [
          provideRouter([{ path: '**', children: [] }]),
          provideHttpClient(withInterceptors([apiResponseInterceptor])),
          provideHttpClientTesting(),
          {
            provide: ActivatedRoute,
            useValue: { params: of({}), snapshot: { params: {} } },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(SubjectTypeForm);
      http = TestBed.inject(HttpTestingController);
      notification = TestBed.inject(NotificationService);
      fixture.detectChanges();
    });

    afterEach(() => http.verify());

    it('renders empty form in create mode', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('h2')?.textContent).toContain('Create');
      expect(el.querySelector('input[formControlName="key"]')).toBeTruthy();
      expect(el.querySelector('input[formControlName="displayName"]')).toBeTruthy();
    });

    it('prevents submission when required fields are empty', () => {
      const component = fixture.componentInstance;
      component.onSubmit();
      expect(http.match('/api/subject-types').length).toBe(0);
    });

    it('shows validation errors for touched empty fields', () => {
      const component = fixture.componentInstance;
      component.form.get('key')!.markAsTouched();
      component.form.get('displayName')!.markAsTouched();
      fixture.detectChanges();

      const errors = fixture.nativeElement.querySelectorAll('.invalid-feedback');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('submits create request and redirects on success', () => {
      const component = fixture.componentInstance;
      component.form.patchValue({ key: 'movie', displayName: 'Movie' });

      component.onSubmit();

      const req = http.expectOne('/api/subject-types');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        key: 'movie',
        displayName: 'Movie',
        settings: [],
      });

      req.flush({
        success: true,
        data: { id: 1, key: 'movie', displayName: 'Movie' },
        error: null,
        traceId: '',
        timestampUtc: '',
      });

      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].type).toBe('success');
    });

    it('disables submit button while submitting', () => {
      const component = fixture.componentInstance;
      component.form.patchValue({ key: 'movie', displayName: 'Movie' });

      component.onSubmit();
      fixture.detectChanges();

      expect(component.submitting()).toBe(true);
      const submitBtn = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(submitBtn.disabled).toBe(true);

      http.expectOne('/api/subject-types').flush({
        success: true,
        data: { id: 1, key: 'movie', displayName: 'Movie' },
        error: null,
        traceId: '',
        timestampUtc: '',
      });
    });

    it('displays server error on API failure', () => {
      const component = fixture.componentInstance;
      component.form.patchValue({ key: 'movie', displayName: 'Movie' });

      component.onSubmit();

      http.expectOne('/api/subject-types').flush({
        success: false,
        data: null,
        error: { code: 'DUPLICATE_KEY', message: 'Key already exists', details: null },
        traceId: '',
        timestampUtc: '',
      });
      fixture.detectChanges();

      expect(component.serverError()).toBe('Key already exists');
      const alert = fixture.nativeElement.querySelector('.alert-danger');
      expect(alert?.textContent).toContain('Key already exists');
    });

    it('includes settings in the request payload', () => {
      const component = fixture.componentInstance;
      component.form.patchValue({ key: 'movie', displayName: 'Movie' });
      component.addSetting();
      component.settings.at(0).patchValue({ key: 'max_rating', value: '5', note: 'Max' });

      component.onSubmit();

      const req = http.expectOne('/api/subject-types');
      expect(req.request.body.settings).toEqual([{ key: 'max_rating', value: '5', note: 'Max' }]);

      req.flush({
        success: true,
        data: { id: 1, key: 'movie', displayName: 'Movie' },
        error: null,
        traceId: '',
        timestampUtc: '',
      });
    });
  });

  describe('edit mode', () => {
    let fixture: ComponentFixture<SubjectTypeForm>;
    let http: HttpTestingController;
    let notification: NotificationService;

    beforeEach(async () => {
      // Mock history.state for pre-population
      Object.defineProperty(window, 'history', {
        value: {
          ...window.history,
          state: { key: 'movie', displayName: 'Movie' },
        },
        writable: true,
      });

      await TestBed.configureTestingModule({
        imports: [SubjectTypeForm],
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

      fixture = TestBed.createComponent(SubjectTypeForm);
      http = TestBed.inject(HttpTestingController);
      notification = TestBed.inject(NotificationService);
      fixture.detectChanges();
    });

    afterEach(() => http.verify());

    it('renders Edit title in edit mode', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('h2')?.textContent).toContain('Edit');
    });

    it('pre-populates form from history state', () => {
      const component = fixture.componentInstance;
      expect(component.form.getRawValue().key).toBe('movie');
      expect(component.form.getRawValue().displayName).toBe('Movie');
    });

    it('submits PUT request with id on update', () => {
      const component = fixture.componentInstance;
      component.form.patchValue({ displayName: 'Movies' });

      component.onSubmit();

      const req = http.expectOne('/api/subject-types/1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        key: 'movie',
        displayName: 'Movies',
        settings: [],
      });

      req.flush({
        success: true,
        data: { id: 1, key: 'movie', displayName: 'Movies' },
        error: null,
        traceId: '',
        timestampUtc: '',
      });

      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].message).toContain('updated');
    });

    it('displays server error on update failure', () => {
      const component = fixture.componentInstance;
      component.form.patchValue({ key: 'existing', displayName: 'Movies' });

      component.onSubmit();

      http.expectOne('/api/subject-types/1').flush({
        success: false,
        data: null,
        error: { code: 'DUPLICATE_KEY', message: 'Key already exists', details: null },
        traceId: '',
        timestampUtc: '',
      });
      fixture.detectChanges();

      expect(component.serverError()).toBe('Key already exists');
    });
  });
});
