import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CriteriaTemplateList } from './criteria-template-list';
import { apiResponseInterceptor } from '../../../core/interceptors/api-response.interceptor';
import { AuthStateService } from '../../../core/services/auth-state.service';

describe('CriteriaTemplateList', () => {
  let fixture: ComponentFixture<CriteriaTemplateList>;
  let http: HttpTestingController;
  let authState: AuthStateService;

  function createComponent(admin = false) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CriteriaTemplateList],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    authState = TestBed.inject(AuthStateService);
    if (admin) {
      authState.setUser({
        id: 'admin-1',
        userName: 'admin',
        displayName: 'Admin',
        email: 'admin@test.com',
        isAdmin: true,
      });
    }

    fixture = TestBed.createComponent(CriteriaTemplateList);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => http.verify());

  function flushSubjectTypes(data: unknown[]) {
    http.expectOne('/api/subject-types').flush({
      success: true,
      data,
      error: null,
      traceId: '',
      timestampUtc: '',
    });
  }

  function flushTemplates(data: unknown[], url = '/api/criteria-templates') {
    http.expectOne(url).flush({
      success: true,
      data,
      error: null,
      traceId: '',
      timestampUtc: '',
    });
  }

  function initComponent(
    templates: unknown[] = [],
    subjectTypes: unknown[] = [
      { id: 1, key: 'movie', displayName: 'Movie' },
      { id: 2, key: 'book', displayName: 'Book' },
    ],
  ) {
    fixture.detectChanges();
    flushSubjectTypes(subjectTypes);
    flushTemplates(templates);
    fixture.detectChanges();
  }

  describe('public view', () => {
    it('renders table with criteria templates', () => {
      createComponent();
      initComponent([
        { id: 1, subjectTypeId: 1, key: 'acting', displayName: 'Acting', isRequired: true },
        { id: 2, subjectTypeId: 2, key: 'writing', displayName: 'Writing', isRequired: false },
      ]);

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('acting');
      expect(rows[0].textContent).toContain('Acting');
      expect(rows[1].textContent).toContain('writing');
      expect(rows[1].textContent).toContain('Writing');
    });

    it('shows subject type name in table', () => {
      createComponent();
      initComponent([
        { id: 1, subjectTypeId: 1, key: 'acting', displayName: 'Acting', isRequired: true },
      ]);

      const row = fixture.nativeElement.querySelector('tbody tr');
      expect(row.textContent).toContain('Movie');
    });

    it('shows Required/Optional badges', () => {
      createComponent();
      initComponent([
        { id: 1, subjectTypeId: 1, key: 'acting', displayName: 'Acting', isRequired: true },
        { id: 2, subjectTypeId: 1, key: 'plot', displayName: 'Plot', isRequired: false },
      ]);

      const badges = fixture.nativeElement.querySelectorAll('.badge');
      expect(badges[0].textContent).toContain('Required');
      expect(badges[0].classList).toContain('bg-success');
      expect(badges[1].textContent).toContain('Optional');
      expect(badges[1].classList).toContain('bg-secondary');
    });

    it('shows empty state when no templates', () => {
      createComponent();
      initComponent([]);

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('No criteria templates found');
    });

    it('shows loading state while fetching', () => {
      createComponent();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Loading');

      flushSubjectTypes([]);
      flushTemplates([]);
    });

    it('View link points to public path', () => {
      createComponent();
      initComponent([
        { id: 1, subjectTypeId: 1, key: 'acting', displayName: 'Acting', isRequired: true },
      ]);

      const link = fixture.nativeElement.querySelector('a[href="/criteria-templates/1"]');
      expect(link).toBeTruthy();
      expect(link.textContent).toContain('View');
    });

    it('does not show Create button for non-admin', () => {
      createComponent(false);
      initComponent([]);

      const link = fixture.nativeElement.querySelector('a[href="/admin/criteria-templates/new"]');
      expect(link).toBeFalsy();
    });

    it('filters by subject type when dropdown changes', () => {
      createComponent();
      initComponent([
        { id: 1, subjectTypeId: 1, key: 'acting', displayName: 'Acting', isRequired: true },
      ]);

      const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
      select.value = '1';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      flushTemplates(
        [{ id: 1, subjectTypeId: 1, key: 'acting', displayName: 'Acting', isRequired: true }],
        '/api/criteria-templates?subjectTypeId=1',
      );
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
    });

    it('clears filter when All is selected', () => {
      createComponent();
      initComponent([
        { id: 1, subjectTypeId: 1, key: 'acting', displayName: 'Acting', isRequired: true },
      ]);

      const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
      select.value = '1';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      flushTemplates([], '/api/criteria-templates?subjectTypeId=1');
      fixture.detectChanges();

      select.value = '';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      flushTemplates(
        [{ id: 1, subjectTypeId: 1, key: 'acting', displayName: 'Acting', isRequired: true }],
        '/api/criteria-templates',
      );
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
    });
  });

  describe('admin view', () => {
    it('shows Create button for admin', () => {
      createComponent(true);
      initComponent([]);

      const link = fixture.nativeElement.querySelector('a[href="/admin/criteria-templates/new"]');
      expect(link).toBeTruthy();
      expect(link.textContent).toContain('Create');
    });
  });
});
