import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { SearchResults } from './search-results';
import { apiResponseInterceptor } from '../../core/interceptors/api-response.interceptor';

describe('SearchResults', () => {
  let fixture: ComponentFixture<SearchResults>;
  let http: HttpTestingController;
  let router: Router;
  let queryParams$: BehaviorSubject<Record<string, string>>;

  const envelope = (data: unknown) => ({
    success: true,
    data,
    error: null,
    traceId: '',
    timestampUtc: '',
  });

  const errorEnvelope = (code: string, message: string) => ({
    success: false,
    data: null,
    error: { code, message, details: null },
    traceId: '',
    timestampUtc: '',
  });

  const mockSearchResponse = {
    results: [
      {
        type: 'Subject' as const,
        subjectId: 10,
        reviewId: null,
        title: 'Inception',
        subtitle: 'Movie',
        excerpt: 'A mind-bending thriller',
        score: 0.95,
        createdAtUtc: '2026-01-15T10:30:00Z',
      },
      {
        type: 'Review' as const,
        subjectId: 10,
        reviewId: 5,
        title: 'Great movie review',
        subtitle: null,
        excerpt: null,
        score: 0.8,
        createdAtUtc: '2026-01-14T08:00:00Z',
      },
    ],
    sort: 'Relevance',
    type: 'All',
    nextCursor: null,
  };

  function createComponent(params: Record<string, string> = {}) {
    queryParams$ = new BehaviorSubject(params);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SearchResults],
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParams: queryParams$.asObservable() },
        },
      ],
    });

    fixture = TestBed.createComponent(SearchResults);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  }

  afterEach(() => http.verify());

  describe('US1: Search Results Page', () => {
    it('pre-fills query from URL param and fetches results', () => {
      createComponent({ q: 'inception' });
      fixture.detectChanges();

      http.expectOne((r) => r.url === '/api/search' && r.params.get('Query') === 'inception')
        .flush(envelope(mockSearchResponse));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const searchInput = el.querySelector('input[type="search"], input.search-input') as HTMLInputElement;
      expect(searchInput).toBeTruthy();
      expect(searchInput.value).toBe('inception');

      const items = el.querySelectorAll('.list-group-item');
      expect(items.length).toBe(2);
    });

    it('shows loading state before API responds', () => {
      createComponent({ q: 'test' });
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Loading');

      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockSearchResponse));
    });

    it('displays results with type badge, title, subtitle, excerpt, and date', () => {
      createComponent({ q: 'inception' });
      fixture.detectChanges();

      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockSearchResponse));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const items = el.querySelectorAll('.list-group-item');
      expect(items.length).toBe(2);

      const first = items[0];
      expect(first.textContent).toContain('Subject');
      expect(first.textContent).toContain('Inception');
      expect(first.textContent).toContain('Movie');
      expect(first.textContent).toContain('A mind-bending thriller');
      expect(first.textContent).toContain('2026-01-15');

      const second = items[1];
      expect(second.textContent).toContain('Review');
      expect(second.textContent).toContain('Great movie review');
    });

    it('shows empty state when no results match', () => {
      createComponent({ q: 'zzzznonexistent' });
      fixture.detectChanges();

      http.expectOne((r) => r.url === '/api/search').flush(
        envelope({ results: [], sort: 'Relevance', type: 'All', nextCursor: null }),
      );
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('No results found');
      expect(el.textContent).toContain('zzzznonexistent');
    });

    it('shows error state with retry button on failure', () => {
      createComponent({ q: 'fail' });
      fixture.detectChanges();

      http.expectOne((r) => r.url === '/api/search')
        .flush(errorEnvelope('INTERNAL_ERROR', 'Something went wrong'));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Something went wrong');

      const retryBtn = el.querySelector('button.btn-retry') as HTMLButtonElement | null;
      expect(retryBtn).toBeTruthy();
      expect(retryBtn!.textContent).toContain('Retry');

      retryBtn!.click();
      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockSearchResponse));
      fixture.detectChanges();

      expect(el.querySelectorAll('.list-group-item').length).toBe(2);
    });

    it('shows prompt message when no query provided', () => {
      createComponent({});
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Enter a search term');
      // No API call should be made
    });

    it('subject result links to /reviews?subjectId=N', () => {
      createComponent({ q: 'inception' });
      fixture.detectChanges();

      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockSearchResponse));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const subjectLink = el.querySelector('a[href*="subjectId=10"]');
      expect(subjectLink).toBeTruthy();
      expect(subjectLink!.getAttribute('href')).toBe('/reviews?subjectId=10');
    });

    it('review result links to /reviews/N', () => {
      createComponent({ q: 'inception' });
      fixture.detectChanges();

      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockSearchResponse));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const reviewLink = el.querySelector('a[href="/reviews/5"]');
      expect(reviewLink).toBeTruthy();
    });

    it('hides subtitle area when subtitle is null', () => {
      createComponent({ q: 'inception' });
      fixture.detectChanges();

      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockSearchResponse));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const items = el.querySelectorAll('.list-group-item');
      const second = items[1]; // This has subtitle: null
      const subtitle = second.querySelector('.result-subtitle');
      expect(subtitle).toBeFalsy();
    });

    it('hides excerpt area when excerpt is null', () => {
      createComponent({ q: 'inception' });
      fixture.detectChanges();

      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockSearchResponse));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const items = el.querySelectorAll('.list-group-item');
      const second = items[1]; // This has excerpt: null
      const excerpt = second.querySelector('.result-excerpt');
      expect(excerpt).toBeFalsy();
    });

    it('submitting search form on the page triggers new search', () => {
      createComponent({ q: 'inception' });
      fixture.detectChanges();

      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockSearchResponse));
      fixture.detectChanges();

      // Simulate URL change (as if form submitted with new query)
      queryParams$.next({ q: 'matrix' });
      fixture.detectChanges();

      const req = http.expectOne((r) => r.url === '/api/search' && r.params.get('Query') === 'matrix');
      req.flush(envelope({
        results: [{ type: 'Subject', subjectId: 11, reviewId: null, title: 'The Matrix', subtitle: 'Movie', excerpt: 'Neo discovers...', score: 0.9, createdAtUtc: '2026-01-10T10:00:00Z' }],
        sort: 'Relevance',
        type: 'All',
        nextCursor: null,
      }));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const items = el.querySelectorAll('.list-group-item');
      expect(items.length).toBe(1);
      expect(items[0].textContent).toContain('The Matrix');
    });
  });

  describe('US3: Type Filter & Sort', () => {
    it('selecting type "subjects" re-fetches with Type param', () => {
      createComponent({ q: 'test' });
      fixture.detectChanges();

      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockSearchResponse));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const typeSelect = el.querySelector('.type-filter') as HTMLSelectElement;
      expect(typeSelect).toBeTruthy();

      // Simulate navigating with type param
      const navigateSpy = vi.spyOn(router, 'navigate');
      typeSelect.value = 'subjects';
      typeSelect.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(navigateSpy).toHaveBeenCalledWith(['/search'], expect.objectContaining({
        queryParams: expect.objectContaining({ type: 'subjects' }),
      }));
    });

    it('selecting type "reviews" re-fetches with Type param', () => {
      createComponent({ q: 'test' });
      fixture.detectChanges();

      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockSearchResponse));
      fixture.detectChanges();

      const navigateSpy = vi.spyOn(router, 'navigate');
      const el = fixture.nativeElement as HTMLElement;
      const typeSelect = el.querySelector('.type-filter') as HTMLSelectElement;
      typeSelect.value = 'reviews';
      typeSelect.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(navigateSpy).toHaveBeenCalledWith(['/search'], expect.objectContaining({
        queryParams: expect.objectContaining({ type: 'reviews' }),
      }));
    });

    it('selecting sort "latest" re-fetches with Sort param', () => {
      createComponent({ q: 'test' });
      fixture.detectChanges();

      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockSearchResponse));
      fixture.detectChanges();

      const navigateSpy = vi.spyOn(router, 'navigate');
      const el = fixture.nativeElement as HTMLElement;
      const sortSelect = el.querySelector('.sort-filter') as HTMLSelectElement;
      expect(sortSelect).toBeTruthy();

      sortSelect.value = 'latest';
      sortSelect.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(navigateSpy).toHaveBeenCalledWith(['/search'], expect.objectContaining({
        queryParams: expect.objectContaining({ sort: 'latest' }),
      }));
    });

    it('navigating with type and sort pre-selects filters and fetches with params', () => {
      createComponent({ q: 'test', type: 'reviews', sort: 'latest' });
      fixture.detectChanges();

      const req = http.expectOne((r) => r.url === '/api/search');
      expect(req.request.params.get('Type')).toBe('reviews');
      expect(req.request.params.get('Sort')).toBe('latest');
      req.flush(envelope(mockSearchResponse));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const typeSelect = el.querySelector('.type-filter') as HTMLSelectElement;
      const sortSelect = el.querySelector('.sort-filter') as HTMLSelectElement;
      expect(typeSelect.value).toBe('reviews');
      expect(sortSelect.value).toBe('latest');
    });

    it('changing filter updates URL query params via queryParams change', () => {
      createComponent({ q: 'test' });
      fixture.detectChanges();

      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockSearchResponse));
      fixture.detectChanges();

      // Simulate URL change with type param (as if navigate happened)
      queryParams$.next({ q: 'test', type: 'subjects' });
      fixture.detectChanges();

      const req = http.expectOne((r) => r.url === '/api/search');
      expect(req.request.params.get('Type')).toBe('subjects');
      req.flush(envelope({
        results: [mockSearchResponse.results[0]],
        sort: 'Relevance',
        type: 'Subjects',
        nextCursor: null,
      }));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelectorAll('.list-group-item').length).toBe(1);
    });
  });

  const mockSearchResponseWithCursor = {
    ...mockSearchResponse,
    nextCursor: 'cursor-page-2',
  };

  const mockPage2Response = {
    results: [
      {
        type: 'Subject' as const,
        subjectId: 20,
        reviewId: null,
        title: 'Interstellar',
        subtitle: 'Movie',
        excerpt: 'A space odyssey',
        score: 0.7,
        createdAtUtc: '2026-01-10T10:00:00Z',
      },
    ],
    sort: 'Relevance',
    type: 'All',
    nextCursor: null,
  };

  describe('US4: Load More Pagination', () => {
    it('shows "Load more" button when nextCursor exists', () => {
      createComponent({ q: 'test' });
      fixture.detectChanges();

      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockSearchResponseWithCursor));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const loadMoreBtn = el.querySelector('.btn-load-more') as HTMLButtonElement;
      expect(loadMoreBtn).toBeTruthy();
      expect(loadMoreBtn.textContent).toContain('Load more');
    });

    it('clicking "Load more" fetches with cursor and appends results', () => {
      createComponent({ q: 'test' });
      fixture.detectChanges();

      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockSearchResponseWithCursor));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelectorAll('.list-group-item').length).toBe(2);

      const loadMoreBtn = el.querySelector('.btn-load-more') as HTMLButtonElement;
      loadMoreBtn.click();
      fixture.detectChanges();

      const req = http.expectOne((r) => r.url === '/api/search' && r.params.get('Cursor') === 'cursor-page-2');
      req.flush(envelope(mockPage2Response));
      fixture.detectChanges();

      expect(el.querySelectorAll('.list-group-item').length).toBe(3);
      expect(el.textContent).toContain('Interstellar');
    });

    it('shows loading state on "Load more" button while fetching', () => {
      createComponent({ q: 'test' });
      fixture.detectChanges();

      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockSearchResponseWithCursor));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const loadMoreBtn = el.querySelector('.btn-load-more') as HTMLButtonElement;
      loadMoreBtn.click();
      fixture.detectChanges();

      expect(loadMoreBtn.disabled).toBe(true);

      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockPage2Response));
      fixture.detectChanges();

      // Button should be gone since nextCursor is null
      expect(el.querySelector('.btn-load-more')).toBeFalsy();
    });

    it('hides "Load more" button when nextCursor is null', () => {
      createComponent({ q: 'test' });
      fixture.detectChanges();

      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockSearchResponse)); // nextCursor: null
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.btn-load-more')).toBeFalsy();
    });

    it('changing query resets results to first page', () => {
      createComponent({ q: 'test' });
      fixture.detectChanges();

      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockSearchResponseWithCursor));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelectorAll('.list-group-item').length).toBe(2);

      // Load more
      (el.querySelector('.btn-load-more') as HTMLButtonElement).click();
      http.expectOne((r) => r.url === '/api/search').flush(envelope(mockPage2Response));
      fixture.detectChanges();
      expect(el.querySelectorAll('.list-group-item').length).toBe(3);

      // Change query — should reset
      queryParams$.next({ q: 'newquery' });
      fixture.detectChanges();

      const req = http.expectOne((r) => r.url === '/api/search' && r.params.get('Query') === 'newquery');
      expect(req.request.params.has('Cursor')).toBe(false);
      req.flush(envelope(mockSearchResponse));
      fixture.detectChanges();

      expect(el.querySelectorAll('.list-group-item').length).toBe(2);
    });
  });
});
