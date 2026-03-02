import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PublicSubjectTypeList } from './subject-type-list';
import { apiResponseInterceptor } from '../../../core/interceptors/api-response.interceptor';

describe('PublicSubjectTypeList', () => {
  let fixture: ComponentFixture<PublicSubjectTypeList>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicSubjectTypeList],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicSubjectTypeList);
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

  function initComponent(subjectTypes: unknown[] = []) {
    fixture.detectChanges();
    http.expectOne('/api/subject-types').flush(envelope(subjectTypes));
    fixture.detectChanges();
  }

  it('shows loading state while fetching', () => {
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Loading');

    http.expectOne('/api/subject-types').flush(envelope([]));
  });

  it('renders subject types list', () => {
    initComponent([
      { id: 1, key: 'movie', displayName: 'Movie' },
      { id: 2, key: 'book', displayName: 'Book' },
    ]);

    const items = fixture.nativeElement.querySelectorAll('.list-group-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Movie');
    expect(items[1].textContent).toContain('Book');
  });

  it('links to subjects page filtered by type', () => {
    initComponent([{ id: 1, key: 'movie', displayName: 'Movie' }]);

    const link = fixture.nativeElement.querySelector('a[href="/subjects?subjectTypeId=1"]');
    expect(link).toBeTruthy();
  });

  it('does not link to admin pages', () => {
    initComponent([{ id: 1, key: 'movie', displayName: 'Movie' }]);

    const adminLink = fixture.nativeElement.querySelector('a[href*="/admin"]');
    expect(adminLink).toBeFalsy();
  });

  it('shows empty state when no subject types', () => {
    initComponent([]);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No subject types found');
  });

  it('does not show Create or Edit or Delete buttons', () => {
    initComponent([{ id: 1, key: 'movie', displayName: 'Movie' }]);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).not.toContain('Create');
    expect(el.textContent).not.toContain('Edit');
    expect(el.textContent).not.toContain('Delete');
  });
});
