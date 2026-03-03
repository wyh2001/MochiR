import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ReviewDetail } from './review-detail';
import { apiResponseInterceptor } from '../../../core/interceptors/api-response.interceptor';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';

describe('ReviewDetail', () => {
  let fixture: ComponentFixture<ReviewDetail>;
  let http: HttpTestingController;
  let authState: AuthStateService;

  const envelope = (data: unknown) => ({
    success: true,
    data,
    error: null,
    traceId: '',
    timestampUtc: '',
  });

  const mockDetail = {
    id: 1,
    subjectId: 1,
    subjectName: 'Inception',
    subjectSlug: 'inception',
    userId: 'john-1',
    authorUserName: 'john',
    authorDisplayName: 'John Doe',
    authorAvatarUrl: null,
    title: 'Great movie',
    content: 'This is a great movie with amazing visuals.',
    excerpt: 'Great movie...',
    excerptIsAuto: true,
    tags: ['sci-fi', 'thriller'],
    ratings: [
      { key: 'story', label: 'Story', score: 9 },
      { key: 'visuals', label: 'Visuals', score: 10 },
    ],
    likeCount: 5,
    isLikedByCurrentUser: false,
    status: 1,
    createdAt: '2026-01-15T10:30:00Z',
    updatedAt: '2026-01-16T12:00:00Z',
    media: [
      {
        id: 1,
        type: 0,
        url: 'https://example.com/image.jpg',
        metadata: [{ key: 'alt', value: 'Movie poster', note: null }],
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewDetail],
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

    fixture = TestBed.createComponent(ReviewDetail);
    http = TestBed.inject(HttpTestingController);
    authState = TestBed.inject(AuthStateService);
  });

  afterEach(() => http.verify());

  function flushDetail(data: unknown = mockDetail) {
    http.expectOne('/api/reviews/1').flush(envelope(data));
    fixture.detectChanges();
  }

  it('fetches and displays review details', () => {
    fixture.detectChanges();
    flushDetail();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Great movie');
    expect(el.textContent).toContain('This is a great movie with amazing visuals.');
    expect(el.textContent).toContain('John Doe');
    expect(el.textContent).toContain('Inception');
  });

  it('displays ratings table', () => {
    fixture.detectChanges();
    flushDetail();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Story');
    expect(el.textContent).toContain('9');
    expect(el.textContent).toContain('Visuals');
    expect(el.textContent).toContain('10');
  });

  it('displays tags', () => {
    fixture.detectChanges();
    flushDetail();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('sci-fi');
    expect(el.textContent).toContain('thriller');
  });

  it('displays media attachments', () => {
    fixture.detectChanges();
    flushDetail();

    const img = fixture.nativeElement.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.src).toContain('example.com/image.jpg');
  });

  it('hides media section when no media', () => {
    fixture.detectChanges();
    flushDetail({ ...mockDetail, media: [] });

    const mediaSection = fixture.nativeElement.querySelector('.review-media');
    expect(mediaSection).toBeFalsy();
  });

  it('displays timestamps', () => {
    fixture.detectChanges();
    flushDetail();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('2026-01-15');
    expect(el.textContent).toContain('2026-01-16');
  });

  it('displays like count', () => {
    fixture.detectChanges();
    flushDetail();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('5');
  });

  it('shows Edit and Delete buttons when user is author', () => {
    authState.setUser({
      id: 'john-1',
      userName: 'john',
      displayName: 'John Doe',
      email: 'john@test.com',
      isAdmin: false,
    });
    fixture.detectChanges();
    flushDetail();

    const editLink = fixture.nativeElement.querySelector('a[href="/reviews/1/edit"]');
    expect(editLink).toBeTruthy();
    expect(editLink.textContent).toContain('Edit');

    const deleteBtn = fixture.nativeElement.querySelector('.btn-delete');
    expect(deleteBtn).toBeTruthy();
  });

  it('hides Edit and Delete buttons when user is not author', () => {
    authState.setUser({
      id: 'jane-1',
      userName: 'jane',
      displayName: 'Jane Doe',
      email: 'jane@test.com',
      isAdmin: false,
    });
    fixture.detectChanges();
    flushDetail();

    const editLink = fixture.nativeElement.querySelector('a[href="/reviews/1/edit"]');
    expect(editLink).toBeFalsy();

    const deleteBtn = fixture.nativeElement.querySelector('.btn-delete');
    expect(deleteBtn).toBeFalsy();
  });

  it('hides Edit and Delete buttons when not authenticated', () => {
    fixture.detectChanges();
    flushDetail();

    const editLink = fixture.nativeElement.querySelector('a[href="/reviews/1/edit"]');
    expect(editLink).toBeFalsy();

    const deleteBtn = fixture.nativeElement.querySelector('.btn-delete');
    expect(deleteBtn).toBeFalsy();
  });

  it('shows error on review not found', () => {
    fixture.detectChanges();
    http.expectOne('/api/reviews/1').flush({
      success: false,
      data: null,
      error: { code: 'REVIEW_NOT_FOUND', message: 'Review not found', details: null },
      traceId: '',
      timestampUtc: '',
    });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Review not found');
    const backLink = el.querySelector('a[href="/reviews"]');
    expect(backLink).toBeTruthy();
  });

  it('shows loading state', () => {
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Loading');

    flushDetail();
  });

  it('shows Back to reviews link', () => {
    fixture.detectChanges();
    flushDetail();

    const backLink = fixture.nativeElement.querySelector('a[href="/reviews"]');
    expect(backLink).toBeTruthy();
    expect(backLink.textContent).toContain('Back');
  });

  describe('delete confirmation', () => {
    let notification: NotificationService;

    beforeEach(() => {
      notification = TestBed.inject(NotificationService);
      authState.setUser({
        id: 'john-1',
        userName: 'john',
        displayName: 'John Doe',
        email: 'john@test.com',
        isAdmin: false,
      });
    });

    it('shows confirmation with warning when Delete is clicked', () => {
      fixture.detectChanges();
      flushDetail();

      const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Are you sure');
      expect(el.querySelector('.btn-confirm-delete')).toBeTruthy();
      expect(el.querySelector('.btn-cancel-delete')).toBeTruthy();
    });

    it('sends DELETE and redirects with notification on confirm', () => {
      fixture.detectChanges();
      flushDetail();

      const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      const confirmBtn: HTMLButtonElement =
        fixture.nativeElement.querySelector('.btn-confirm-delete');
      confirmBtn.click();

      const req = http.expectOne('/api/reviews/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope({ id: 1, deleted: true }));

      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].type).toBe('success');
      expect(notification.notifications()[0].message).toContain('deleted');
    });

    it('hides confirmation when Cancel is clicked', () => {
      fixture.detectChanges();
      flushDetail();

      const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.btn-confirm-delete')).toBeTruthy();

      const cancelBtn: HTMLButtonElement =
        fixture.nativeElement.querySelector('.btn-cancel-delete');
      cancelBtn.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.btn-confirm-delete')).toBeFalsy();
      expect(fixture.nativeElement.querySelector('.btn-delete')).toBeTruthy();
    });

    it('shows error on delete failure', () => {
      fixture.detectChanges();
      flushDetail();

      const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      const confirmBtn: HTMLButtonElement =
        fixture.nativeElement.querySelector('.btn-confirm-delete');
      confirmBtn.click();

      http.expectOne('/api/reviews/1').flush({
        success: false,
        data: null,
        error: { code: 'DELETE_FAILED', message: 'Cannot delete review', details: null },
        traceId: '',
        timestampUtc: '',
      });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Cannot delete review');
    });
  });

  describe('like/unlike', () => {
    it('sends POST like and updates count and liked state', () => {
      authState.setUser({
        id: 'jane-1',
        userName: 'jane',
        displayName: 'Jane Doe',
        email: 'jane@test.com',
        isAdmin: false,
      });
      fixture.detectChanges();
      flushDetail({ ...mockDetail, isLikedByCurrentUser: false, likeCount: 5 });

      const likeBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-like');
      expect(likeBtn).toBeTruthy();
      expect(likeBtn.textContent).toContain('Like');

      likeBtn.click();

      const req = http.expectOne('/api/reviews/1/like');
      expect(req.request.method).toBe('POST');
      req.flush(envelope({ reviewId: 1, likeCount: 6, isLikedByCurrentUser: true }));
      fixture.detectChanges();

      expect(fixture.componentInstance.review()!.likeCount).toBe(6);
      expect(fixture.componentInstance.review()!.isLikedByCurrentUser).toBe(true);
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('6');
      const updatedBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-like');
      expect(updatedBtn.textContent).toContain('Unlike');
    });

    it('sends DELETE unlike and reverts state', () => {
      authState.setUser({
        id: 'jane-1',
        userName: 'jane',
        displayName: 'Jane Doe',
        email: 'jane@test.com',
        isAdmin: false,
      });
      fixture.detectChanges();
      flushDetail({ ...mockDetail, isLikedByCurrentUser: true, likeCount: 6 });

      const likeBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-like');
      expect(likeBtn.textContent).toContain('Unlike');

      likeBtn.click();

      const req = http.expectOne('/api/reviews/1/like');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope({ reviewId: 1, likeCount: 5, isLikedByCurrentUser: false }));
      fixture.detectChanges();

      expect(fixture.componentInstance.review()!.likeCount).toBe(5);
      expect(fixture.componentInstance.review()!.isLikedByCurrentUser).toBe(false);
      const updatedBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-like');
      expect(updatedBtn.textContent).toContain('Like');
    });

    it('does not show like button when not authenticated', () => {
      fixture.detectChanges();
      flushDetail();

      const likeBtn = fixture.nativeElement.querySelector('.btn-like');
      expect(likeBtn).toBeFalsy();
    });

    it('shows like button when authenticated (non-author)', () => {
      authState.setUser({
        id: 'jane-1',
        userName: 'jane',
        displayName: 'Jane Doe',
        email: 'jane@test.com',
        isAdmin: false,
      });
      fixture.detectChanges();
      flushDetail();

      const likeBtn = fixture.nativeElement.querySelector('.btn-like');
      expect(likeBtn).toBeTruthy();
    });

    it('preserves state on like error', () => {
      authState.setUser({
        id: 'jane-1',
        userName: 'jane',
        displayName: 'Jane Doe',
        email: 'jane@test.com',
        isAdmin: false,
      });
      fixture.detectChanges();
      flushDetail({ ...mockDetail, isLikedByCurrentUser: false, likeCount: 5 });

      const likeBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-like');
      likeBtn.click();

      http.expectOne('/api/reviews/1/like').flush({
        success: false,
        data: null,
        error: { code: 'LIKE_FAILED', message: 'Like failed', details: null },
        traceId: '',
        timestampUtc: '',
      });
      fixture.detectChanges();

      // State should remain unchanged since error handler doesn't update the signal
      expect(fixture.componentInstance.review()!.likeCount).toBe(5);
      expect(fixture.componentInstance.review()!.isLikedByCurrentUser).toBe(false);
    });
  });
});
