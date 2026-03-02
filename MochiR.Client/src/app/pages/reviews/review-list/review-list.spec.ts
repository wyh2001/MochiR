import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ReviewList } from './review-list';
import { apiResponseInterceptor } from '../../../core/interceptors/api-response.interceptor';

describe('ReviewList', () => {
  let fixture: ComponentFixture<ReviewList>;
  let http: HttpTestingController;

  const mockReview = {
    id: 1,
    subjectId: 1,
    subjectName: 'Inception',
    userId: 'john',
    authorUserName: 'john',
    authorDisplayName: 'John Doe',
    authorAvatarUrl: null,
    title: 'Great movie',
    content: 'Full content here',
    excerpt: 'Great movie...',
    excerptIsAuto: true,
    ratings: [{ key: 'story', label: 'Story', score: 9 }],
    status: 1,
    tags: ['sci-fi'],
    likeCount: 5,
    isLikedByCurrentUser: false,
    createdAt: '2026-01-15T10:30:00Z',
  };

  const envelope = (data: unknown) => ({
    success: true,
    data,
    error: null,
    traceId: '',
    timestampUtc: '',
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewList],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParams: {} },
            queryParams: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewList);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function flushLatest(
    items: unknown[] = [mockReview],
    hasMore = false,
    nextCursor: unknown = null,
  ) {
    http.expectOne('/api/reviews/latest').flush(
      envelope({
        totalCount: items.length,
        page: 1,
        pageSize: 10,
        items,
        nextCursor,
        hasMore,
      }),
    );
    fixture.detectChanges();
  }

  it('renders review cards', () => {
    fixture.detectChanges();
    flushLatest();

    const cards = fixture.nativeElement.querySelectorAll('app-review-card');
    expect(cards.length).toBe(1);
  });

  it('shows Load More when hasMore is true', () => {
    fixture.detectChanges();
    flushLatest([mockReview], true, { createdAtUtc: '2026-01-15T10:30:00Z', reviewId: 1 });

    const loadMoreBtn = fixture.nativeElement.querySelector('.btn-load-more');
    expect(loadMoreBtn).toBeTruthy();
  });

  it('hides Load More when hasMore is false', () => {
    fixture.detectChanges();
    flushLatest([mockReview], false);

    const loadMoreBtn = fixture.nativeElement.querySelector('.btn-load-more');
    expect(loadMoreBtn).toBeFalsy();
  });

  it('appends items on Load More click', () => {
    fixture.detectChanges();
    const review2 = { ...mockReview, id: 2, title: 'Second review' };
    flushLatest([mockReview], true, { createdAtUtc: '2026-01-15T10:30:00Z', reviewId: 1 });

    const loadMoreBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-load-more');
    loadMoreBtn.click();

    const req = http.expectOne('/api/reviews/latest?After=2026-01-15T10:30:00Z&AfterId=1');
    req.flush(
      envelope({
        totalCount: 2,
        page: 2,
        pageSize: 10,
        items: [review2],
        nextCursor: null,
        hasMore: false,
      }),
    );
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-review-card');
    expect(cards.length).toBe(2);
  });

  it('shows empty state when no reviews', () => {
    fixture.detectChanges();
    flushLatest([]);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No reviews');
  });

  it('shows loading state', () => {
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Loading');

    flushLatest();
  });

  it('shows page title', () => {
    fixture.detectChanges();
    flushLatest();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Latest Reviews');
  });
});

describe('ReviewList filtered mode', () => {
  const mockReview = {
    id: 1,
    subjectId: 1,
    subjectName: 'Inception',
    userId: 'john',
    authorUserName: 'john',
    authorDisplayName: 'John Doe',
    authorAvatarUrl: null,
    title: 'Great movie',
    content: 'Full content here',
    excerpt: 'Great movie...',
    excerptIsAuto: true,
    ratings: [{ key: 'story', label: 'Story', score: 9 }],
    status: 1,
    tags: ['sci-fi'],
    likeCount: 5,
    isLikedByCurrentUser: false,
    createdAt: '2026-01-15T10:30:00Z',
  };

  const envelope = (data: unknown) => ({
    success: true,
    data,
    error: null,
    traceId: '',
    timestampUtc: '',
  });

  function createFiltered(queryParams: Record<string, string>) {
    TestBed.configureTestingModule({
      imports: [ReviewList],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParams },
            queryParams: of(queryParams),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(ReviewList);
    const http = TestBed.inject(HttpTestingController);
    return { fixture, http };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('filters by subjectId query param', () => {
    const { fixture, http } = createFiltered({ subjectId: '1' });
    fixture.detectChanges();

    const req = http.expectOne('/api/reviews?subjectId=1');
    expect(req.request.method).toBe('GET');
    req.flush(envelope([mockReview]));
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-review-card');
    expect(cards.length).toBe(1);
  });

  it('filters by userId query param', () => {
    const { fixture, http } = createFiltered({ userId: 'john' });
    fixture.detectChanges();

    const req = http.expectOne('/api/reviews?userId=john');
    expect(req.request.method).toBe('GET');
    req.flush(envelope([mockReview]));
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-review-card');
    expect(cards.length).toBe(1);
  });

  it('shows empty state when no filtered results', () => {
    const { fixture, http } = createFiltered({ subjectId: '999' });
    fixture.detectChanges();

    http.expectOne('/api/reviews?subjectId=999').flush(envelope([]));
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No reviews');
  });

  it('hides Load More in filtered mode', () => {
    const { fixture, http } = createFiltered({ subjectId: '1' });
    fixture.detectChanges();

    http.expectOne('/api/reviews?subjectId=1').flush(envelope([mockReview]));
    fixture.detectChanges();

    const loadMoreBtn = fixture.nativeElement.querySelector('.btn-load-more');
    expect(loadMoreBtn).toBeFalsy();
  });

  it('shows Reviews heading in filtered mode', () => {
    const { fixture, http } = createFiltered({ subjectId: '1' });
    fixture.detectChanges();

    http.expectOne('/api/reviews?subjectId=1').flush(envelope([mockReview]));
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Reviews');
    expect(el.textContent).not.toContain('Latest Reviews');
  });
});
