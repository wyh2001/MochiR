import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PublicSubjectList } from './subject-list';
import { apiResponseInterceptor } from '../../../core/interceptors/api-response.interceptor';

describe('PublicSubjectList', () => {
  let fixture: ComponentFixture<PublicSubjectList>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicSubjectList],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicSubjectList);
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

  it('shows loading state while fetching', () => {
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Loading');

    http.expectOne('/api/subject-types').flush(envelope([]));
    http.expectOne('/api/subjects').flush(envelope([]));
  });

  it('renders subjects list', () => {
    initComponent([
      { id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 },
      { id: 2, name: 'Dune', slug: 'dune', subjectTypeId: 2 },
    ]);

    const items = fixture.nativeElement.querySelectorAll('.list-group-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Inception');
    expect(items[0].textContent).toContain('Movie');
    expect(items[1].textContent).toContain('Dune');
    expect(items[1].textContent).toContain('Book');
  });

  it('links to public subject detail page', () => {
    initComponent([{ id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 }]);

    const link = fixture.nativeElement.querySelector('a[href="/subjects/1"]');
    expect(link).toBeTruthy();
  });

  it('does not link to admin pages', () => {
    initComponent([{ id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 }]);

    const adminLink = fixture.nativeElement.querySelector('a[href*="/admin"]');
    expect(adminLink).toBeFalsy();
  });

  it('shows empty state when no subjects', () => {
    initComponent([]);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No subjects found');
  });

  it('does not show Create button', () => {
    initComponent([]);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).not.toContain('Create');
  });

  it('filters by subject type when dropdown changes', () => {
    initComponent([{ id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 }]);

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = '1';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    http
      .expectOne('/api/subjects?subjectTypeId=1')
      .flush(envelope([{ id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 }]));
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.list-group-item');
    expect(items.length).toBe(1);
  });
});
