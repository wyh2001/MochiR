import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SubjectList } from './subject-list';
import { apiResponseInterceptor } from '../../../../core/interceptors/api-response.interceptor';
import { AuthStateService } from '../../../../core/services/auth-state.service';

describe('SubjectList', () => {
  let fixture: ComponentFixture<SubjectList>;
  let http: HttpTestingController;
  let authState: AuthStateService;

  function createComponent(admin = false) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SubjectList],
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

    fixture = TestBed.createComponent(SubjectList);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => http.verify());

  const envelope = (data: unknown) => ({
    success: true,
    data,
    error: null,
    traceId: '',
    timestampUtc: '',
  });

  function initComponent(
    subjects: unknown[] = [],
    subjectTypes: unknown[] = [
      { id: 1, key: 'movie', displayName: 'Movie' },
      { id: 2, key: 'book', displayName: 'Book' },
    ],
  ) {
    fixture.detectChanges();
    http.expectOne('/api/subject-types').flush(envelope(subjectTypes));
    http.expectOne('/api/subjects').flush(envelope(subjects));
    fixture.detectChanges();
  }

  describe('public view', () => {
    it('renders table with subjects', () => {
      createComponent();
      initComponent([
        { id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 },
        { id: 2, name: 'Dune', slug: 'dune', subjectTypeId: 2 },
      ]);

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('Inception');
      expect(rows[1].textContent).toContain('Dune');
    });

    it('shows subject type name in table', () => {
      createComponent();
      initComponent([{ id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 }]);

      const row = fixture.nativeElement.querySelector('tbody tr');
      expect(row.textContent).toContain('Movie');
    });

    it('shows empty state when no subjects', () => {
      createComponent();
      initComponent([]);

      expect(fixture.nativeElement.textContent).toContain('No subjects found');
    });

    it('shows loading state while fetching', () => {
      createComponent();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Loading');

      http.expectOne('/api/subject-types').flush(envelope([]));
      http.expectOne('/api/subjects').flush(envelope([]));
    });

    it('links to /subjects/:id', () => {
      createComponent();
      initComponent([{ id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 }]);

      const viewLink = fixture.nativeElement.querySelector('a[href="/subjects/1"]');
      expect(viewLink).toBeTruthy();
      expect(viewLink.textContent).toContain('View');
    });

    it('does not show Create button for non-admin', () => {
      createComponent(false);
      initComponent([]);

      const createLink = fixture.nativeElement.querySelector('a[href="/admin/subjects/new"]');
      expect(createLink).toBeFalsy();
    });

    it('filters by subject type when dropdown changes', () => {
      createComponent();
      initComponent([{ id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 }]);

      const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
      select.value = '1';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      http
        .expectOne('/api/subjects?subjectTypeId=1')
        .flush(envelope([{ id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 }]));
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
    });

    it('clears filter when All is selected', () => {
      createComponent();
      initComponent([{ id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 }]);

      const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
      select.value = '1';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      http.expectOne('/api/subjects?subjectTypeId=1').flush(envelope([]));
      fixture.detectChanges();

      select.value = '';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      http
        .expectOne('/api/subjects')
        .flush(envelope([{ id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 }]));
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
    });
  });

  describe('admin view', () => {
    it('shows Create button for admin', () => {
      createComponent(true);
      initComponent([]);

      const createLink = fixture.nativeElement.querySelector('a[href="/admin/subjects/new"]');
      expect(createLink).toBeTruthy();
      expect(createLink.textContent).toContain('Create');
    });
  });
});
