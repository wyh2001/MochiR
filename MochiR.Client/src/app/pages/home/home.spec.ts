import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home';
import { apiResponseInterceptor } from '../../core/interceptors/api-response.interceptor';
import { AuthStateService } from '../../core/services/auth-state.service';

describe('Home', () => {
  let fixture: ComponentFixture<Home>;
  let http: HttpTestingController;
  let authState: AuthStateService;

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

  const mockLatestPage = {
    totalCount: 2,
    page: 1,
    pageSize: 20,
    items: [
      {
        id: 1,
        subjectId: 10,
        subjectName: 'Inception',
        userId: 'user1',
        authorUserName: 'john',
        authorDisplayName: 'John Doe',
        authorAvatarUrl: 'https://example.com/john.jpg',
        title: 'Great movie',
        content: 'Full review content here',
        excerpt: 'Great movie...',
        excerptIsAuto: true,
        ratings: [{ key: 'overall', label: 'Overall', score: 9 }],
        status: 1,
        tags: ['sci-fi'],
        likeCount: 5,
        isLikedByCurrentUser: false,
        createdAt: '2026-01-15T10:30:00Z',
      },
      {
        id: 2,
        subjectId: 11,
        subjectName: 'The Matrix',
        userId: 'user2',
        authorUserName: 'jane',
        authorDisplayName: null,
        authorAvatarUrl: null,
        title: null,
        content: 'Another great film',
        excerpt: 'Another great film',
        excerptIsAuto: true,
        ratings: [],
        status: 1,
        tags: [],
        likeCount: 0,
        isLikedByCurrentUser: false,
        createdAt: '2026-01-14T08:00:00Z',
      },
    ],
    nextCursor: null,
    hasMore: false,
  };

  function createComponent(authenticated = false) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    authState = TestBed.inject(AuthStateService);
    if (authenticated) {
      authState.setUser({
        id: 'user-a',
        userName: 'alice',
        displayName: 'Alice',
        email: 'alice@test.com',
        isAdmin: false,
      });
    }

    fixture = TestBed.createComponent(Home);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => http.verify());

  describe('Latest tab (US1)', () => {
    it('shows Latest tab as active by default', () => {
      createComponent();
      fixture.detectChanges();

      http.expectOne('/api/reviews/latest').flush(envelope(mockLatestPage));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const activeTab = el.querySelector('.nav-link.active');
      expect(activeTab).toBeTruthy();
      expect(activeTab!.textContent).toContain('Latest');
    });

    it('shows loading state before API responds', () => {
      createComponent();
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Loading');

      http.expectOne('/api/reviews/latest').flush(envelope(mockLatestPage));
    });

    it('displays review entries with avatar, username, subject link, rating, title, excerpt, date', () => {
      createComponent();
      fixture.detectChanges();

      http.expectOne('/api/reviews/latest').flush(envelope(mockLatestPage));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const items = el.querySelectorAll('.list-group-item');
      expect(items.length).toBe(2);

      const first = items[0];
      expect(first.querySelector('img')).toBeTruthy();
      expect(first.textContent).toContain('john');
      expect(first.textContent).toContain('Inception');
      expect(first.textContent).toContain('9');
      expect(first.textContent).toContain('Great movie');
      expect(first.textContent).toContain('2026-01-15');

      const subjectLink = first.querySelector('a[href*="subjectId"]');
      expect(subjectLink).toBeTruthy();
      expect(subjectLink!.getAttribute('href')).toContain('subjectId=10');
    });

    it('shows empty state when no reviews available', () => {
      createComponent();
      fixture.detectChanges();

      http.expectOne('/api/reviews/latest').flush(
        envelope({
          totalCount: 0,
          page: 1,
          pageSize: 20,
          items: [],
          nextCursor: null,
          hasMore: false,
        }),
      );
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('No reviews available');
    });

    it('shows error state with retry button on failure', () => {
      createComponent();
      fixture.detectChanges();

      http
        .expectOne('/api/reviews/latest')
        .flush(errorEnvelope('INTERNAL_ERROR', 'Something went wrong'));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Something went wrong');

      const retryBtn = el.querySelector('button.btn-retry') as HTMLButtonElement | null;
      expect(retryBtn).toBeTruthy();
      expect(retryBtn!.textContent).toContain('Retry');

      retryBtn!.click();
      http.expectOne('/api/reviews/latest').flush(envelope(mockLatestPage));
      fixture.detectChanges();

      expect(el.querySelectorAll('.list-group-item').length).toBe(2);
    });

    it('shows avatar placeholder when no avatarUrl', () => {
      createComponent();
      fixture.detectChanges();

      http.expectOne('/api/reviews/latest').flush(envelope(mockLatestPage));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const items = el.querySelectorAll('.list-group-item');
      const second = items[1];
      const placeholder = second.querySelector('.avatar-placeholder');
      expect(placeholder).toBeTruthy();
      expect(placeholder!.textContent?.trim()).toBe('J');
    });

    it('does not show rating when ratings are empty', () => {
      createComponent();
      fixture.detectChanges();

      http.expectOne('/api/reviews/latest').flush(envelope(mockLatestPage));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const items = el.querySelectorAll('.list-group-item');
      const second = items[1];
      const rating = second.querySelector('.rating');
      expect(rating).toBeFalsy();
    });

    it('does not show title when title is null', () => {
      createComponent();
      fixture.detectChanges();

      http.expectOne('/api/reviews/latest').flush(envelope(mockLatestPage));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const items = el.querySelectorAll('.list-group-item');
      const second = items[1];
      const title = second.querySelector('.review-title');
      expect(title).toBeFalsy();
    });

    it('subject name links to /reviews?subjectId=N', () => {
      createComponent();
      fixture.detectChanges();

      http.expectOne('/api/reviews/latest').flush(envelope(mockLatestPage));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const links = el.querySelectorAll('a[href*="subjectId"]');
      expect(links.length).toBe(2);
      expect(links[0].getAttribute('href')).toBe('/reviews?subjectId=10');
      expect(links[1].getAttribute('href')).toBe('/reviews?subjectId=11');
    });
  });

  const mockFeedPage = {
    totalCount: 1,
    page: 1,
    pageSize: 20,
    items: [
      {
        reviewId: 3,
        createdAtUtc: '2026-01-16T08:00:00Z',
        subjectId: 12,
        subjectName: 'Interstellar',
        subjectSlug: 'interstellar',
        subjectTypeId: 1,
        title: 'Amazing film',
        content: 'A masterpiece of cinema',
        authorId: 'user3',
        authorUserName: 'bob',
        authorDisplayName: 'Bob Wilson',
        authorAvatarUrl: null,
      },
    ],
    nextCursor: null,
    hasMore: false,
  };

  function flushBothFeeds() {
    http.expectOne('/api/reviews/latest').flush(envelope(mockLatestPage));
    http.expectOne('/api/feed').flush(envelope(mockFeedPage));
  }

  describe('Following tab (US2)', () => {
    it('shows Following tab when authenticated', () => {
      createComponent(true);
      fixture.detectChanges();

      flushBothFeeds();
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const tabs = el.querySelectorAll('.nav-link');
      const tabTexts = Array.from(tabs).map((t) => t.textContent?.trim());
      expect(tabTexts).toContain('Following');
    });

    it('hides Following tab when not authenticated', () => {
      createComponent(false);
      fixture.detectChanges();

      http.expectOne('/api/reviews/latest').flush(envelope(mockLatestPage));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const tabs = el.querySelectorAll('.nav-link');
      const tabTexts = Array.from(tabs).map((t) => t.textContent?.trim());
      expect(tabTexts).not.toContain('Following');
    });

    it('switching to Following tab shows following items', () => {
      createComponent(true);
      fixture.detectChanges();

      flushBothFeeds();
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const followingTab = Array.from(el.querySelectorAll('.nav-link')).find((t) =>
        t.textContent?.includes('Following'),
      ) as HTMLButtonElement;
      expect(followingTab).toBeTruthy();

      followingTab.click();
      fixture.detectChanges();

      const items = el.querySelectorAll('.list-group-item');
      expect(items.length).toBe(1);
      expect(items[0].textContent).toContain('Interstellar');
      expect(items[0].textContent).toContain('bob');
    });

    it('shows empty state when following feed is empty', () => {
      createComponent(true);
      fixture.detectChanges();

      http.expectOne('/api/reviews/latest').flush(envelope(mockLatestPage));
      http.expectOne('/api/feed').flush(
        envelope({
          totalCount: 0,
          page: 1,
          pageSize: 20,
          items: [],
          nextCursor: null,
          hasMore: false,
        }),
      );
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const followingTab = Array.from(el.querySelectorAll('.nav-link')).find((t) =>
        t.textContent?.includes('Following'),
      ) as HTMLButtonElement;
      followingTab.click();
      fixture.detectChanges();

      expect(el.textContent).toContain("You're not following anyone yet");
    });
  });

  describe('Search filtering (US3)', () => {
    it('typing filters reviews by subjectName', () => {
      createComponent();
      fixture.detectChanges();

      http.expectOne('/api/reviews/latest').flush(envelope(mockLatestPage));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const searchInput = el.querySelector(
        'input[type="search"], input.search-input',
      ) as HTMLInputElement;
      expect(searchInput).toBeTruthy();

      searchInput.value = 'Inception';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const items = el.querySelectorAll('.list-group-item');
      expect(items.length).toBe(1);
      expect(items[0].textContent).toContain('Inception');
    });

    it('clearing search restores all items', () => {
      createComponent();
      fixture.detectChanges();

      http.expectOne('/api/reviews/latest').flush(envelope(mockLatestPage));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const searchInput = el.querySelector(
        'input[type="search"], input.search-input',
      ) as HTMLInputElement;

      searchInput.value = 'Inception';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(el.querySelectorAll('.list-group-item').length).toBe(1);

      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(el.querySelectorAll('.list-group-item').length).toBe(2);
    });

    it('no-match shows search-specific empty state', () => {
      createComponent();
      fixture.detectChanges();

      http.expectOne('/api/reviews/latest').flush(envelope(mockLatestPage));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const searchInput = el.querySelector(
        'input[type="search"], input.search-input',
      ) as HTMLInputElement;

      searchInput.value = 'zzzznonexistent';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(el.querySelectorAll('.list-group-item').length).toBe(0);
      expect(el.textContent).toContain('No results found');
      expect(el.textContent).toContain('zzzznonexistent');
    });

    it('search applies across tab switch', () => {
      createComponent(true);
      fixture.detectChanges();

      http.expectOne('/api/reviews/latest').flush(envelope(mockLatestPage));
      http.expectOne('/api/feed').flush(envelope(mockFeedPage));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const searchInput = el.querySelector(
        'input[type="search"], input.search-input',
      ) as HTMLInputElement;

      // Search on Latest tab
      searchInput.value = 'Inception';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(el.querySelectorAll('.list-group-item').length).toBe(1);

      // Switch to Following tab — search should apply to following items
      const followingTab = Array.from(el.querySelectorAll('.nav-link')).find((t) =>
        t.textContent?.includes('Following'),
      ) as HTMLButtonElement;
      followingTab.click();
      fixture.detectChanges();

      // "Inception" doesn't match any following items
      expect(el.querySelectorAll('.list-group-item').length).toBe(0);
    });
  });
});
