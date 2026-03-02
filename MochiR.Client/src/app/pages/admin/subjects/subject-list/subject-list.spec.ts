import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SubjectList } from './subject-list';
import { apiResponseInterceptor } from '../../../../core/interceptors/api-response.interceptor';

describe('SubjectList', () => {
  let fixture: ComponentFixture<SubjectList>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectList],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubjectList);
    http = TestBed.inject(HttpTestingController);
  });

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

  function flushSubjects(data: unknown[], url = '/api/subjects') {
    http.expectOne(url).flush({
      success: true,
      data,
      error: null,
      traceId: '',
      timestampUtc: '',
    });
  }

  function initComponent(
    subjects: unknown[] = [],
    subjectTypes: unknown[] = [
      { id: 1, key: 'movie', displayName: 'Movie' },
      { id: 2, key: 'book', displayName: 'Book' },
    ],
  ) {
    fixture.detectChanges();
    flushSubjectTypes(subjectTypes);
    flushSubjects(subjects);
    fixture.detectChanges();
  }

  it('renders table with subjects', () => {
    initComponent([
      { id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 },
      { id: 2, name: 'Dune', slug: 'dune', subjectTypeId: 2 },
    ]);

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Inception');
    expect(rows[0].textContent).toContain('inception');
    expect(rows[1].textContent).toContain('Dune');
    expect(rows[1].textContent).toContain('dune');
  });

  it('shows subject type name in table', () => {
    initComponent([{ id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 }]);

    const row = fixture.nativeElement.querySelector('tbody tr');
    expect(row.textContent).toContain('Movie');
  });

  it('shows empty state when no subjects', () => {
    initComponent([]);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No subjects found');
  });

  it('shows loading state while fetching', () => {
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Loading');

    flushSubjectTypes([]);
    flushSubjects([]);
  });

  it('shows Create button linking to new form', () => {
    initComponent([]);

    const link = fixture.nativeElement.querySelector('a[href="/admin/subjects/new"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Create');
  });

  it('shows View link for each subject', () => {
    initComponent([{ id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 }]);

    const viewLink = fixture.nativeElement.querySelector('a[href="/admin/subjects/1"]');
    expect(viewLink).toBeTruthy();
    expect(viewLink.textContent).toContain('View');
  });

  it('filters by subject type when dropdown changes', () => {
    initComponent([{ id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 }]);

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = '1';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    flushSubjects(
      [{ id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 }],
      '/api/subjects?subjectTypeId=1',
    );
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
  });

  it('clears filter when All is selected', () => {
    initComponent([{ id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 }]);

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = '1';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    flushSubjects([], '/api/subjects?subjectTypeId=1');
    fixture.detectChanges();

    select.value = '';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    flushSubjects(
      [{ id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 }],
      '/api/subjects',
    );
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
  });
});
