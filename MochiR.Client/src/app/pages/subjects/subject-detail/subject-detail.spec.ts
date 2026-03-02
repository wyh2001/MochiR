import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { SubjectDetail } from './subject-detail';
import { apiResponseInterceptor } from '../../../core/interceptors/api-response.interceptor';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthStateService } from '../../../core/services/auth-state.service';

describe('SubjectDetail', () => {
  let fixture: ComponentFixture<SubjectDetail>;
  let http: HttpTestingController;
  let authState: AuthStateService;

  function createComponent(role: 'anon' | 'user' | 'admin' = 'anon') {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SubjectDetail],
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
    });

    authState = TestBed.inject(AuthStateService);
    if (role === 'admin') {
      authState.setUser({
        id: 'admin-1',
        userName: 'admin',
        displayName: 'Admin',
        email: 'admin@test.com',
        isAdmin: true,
      });
    } else if (role === 'user') {
      authState.setUser({
        id: 'user-1',
        userName: 'testuser',
        displayName: 'Test User',
        email: 'user@test.com',
        isAdmin: false,
      });
    }

    fixture = TestBed.createComponent(SubjectDetail);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => http.verify());

  const mockDetail = {
    id: 1,
    name: 'Inception',
    slug: 'inception',
    subjectTypeId: 1,
    subjectTypeKey: 'movie',
    subjectTypeDisplayName: 'Movie',
    attributes: [
      { key: 'director', value: 'Christopher Nolan', note: 'Also producer' },
      { key: 'year', value: '2010', note: null },
    ],
    createdAt: '2026-01-15T10:30:00Z',
  };

  const mockFollowPage = {
    totalCount: 1,
    page: 1,
    pageSize: 50,
    items: [
      {
        followId: 10,
        subjectId: 1,
        subjectName: 'Inception',
        subjectSlug: 'inception',
        followedAtUtc: '2026-02-01T00:00:00Z',
      },
    ],
  };

  const emptyFollowPage = {
    totalCount: 0,
    page: 1,
    pageSize: 50,
    items: [],
  };

  const mockAggregate = {
    subjectId: 1,
    countReviews: 10,
    avgOverall: 4.5,
    metrics: [
      { key: 'acting', value: 4.2, count: 8, note: null },
      { key: 'plot', value: 4.8, count: 10, note: null },
    ],
    updatedAt: '2026-03-01T00:00:00Z',
  };

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

  function flushDetail(data: unknown = mockDetail) {
    http.expectOne('/api/subjects/1').flush(envelope(data));
    fixture.detectChanges();
  }

  function flushAggregate(data: unknown = mockAggregate) {
    http.expectOne('/api/ratings/subjects/1').flush(envelope(data));
    fixture.detectChanges();
  }

  function flushAggregateError() {
    http
      .expectOne('/api/ratings/subjects/1')
      .flush(errorEnvelope('NOT_FOUND', 'No aggregate'));
    fixture.detectChanges();
  }

  function flushFollowState(followed = false) {
    const page = followed ? mockFollowPage : emptyFollowPage;
    http.expectOne('/api/follows/subjects?Page=1&PageSize=50').flush(envelope(page));
    fixture.detectChanges();
  }

  describe('public view', () => {
    it('fetches and displays subject details', () => {
      createComponent();
      fixture.detectChanges();
      flushDetail();
      flushAggregate();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Inception');
      expect(el.textContent).toContain('inception');
      expect(el.textContent).toContain('movie');
      expect(el.textContent).toContain('Movie');
    });

    it('displays attributes table', () => {
      createComponent();
      fixture.detectChanges();
      flushDetail();
      flushAggregate();

      const rows = fixture.nativeElement.querySelectorAll('.attributes-table tbody tr');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('director');
      expect(rows[0].textContent).toContain('Christopher Nolan');
      expect(rows[0].textContent).toContain('Also producer');
      expect(rows[1].textContent).toContain('year');
      expect(rows[1].textContent).toContain('2010');
    });

    it('shows no attributes message when empty', () => {
      createComponent();
      fixture.detectChanges();
      flushDetail({ ...mockDetail, attributes: [] });
      flushAggregate();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('No attributes');
    });

    it('shows createdAt date', () => {
      createComponent();
      fixture.detectChanges();
      flushDetail();
      flushAggregate();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('2026-01-15');
    });

    it('shows error on subject not found', () => {
      createComponent();
      fixture.detectChanges();
      http
        .expectOne('/api/subjects/1')
        .flush(errorEnvelope('SUBJECT_NOT_FOUND', 'Subject not found'));
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Subject not found');
      expect(el.querySelector('a[href="/subjects"]')).toBeTruthy();
    });

    it('shows loading state', () => {
      createComponent();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Loading');

      flushDetail();
      flushAggregate();
    });

    it('does not show Edit or Delete buttons for non-admin', () => {
      createComponent('anon');
      fixture.detectChanges();
      flushDetail();
      flushAggregate();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.btn-delete')).toBeFalsy();
      expect(el.querySelector('a[href*="edit"]')).toBeFalsy();
    });

    it('does not show Follow button for unauthenticated user', () => {
      createComponent('anon');
      fixture.detectChanges();
      flushDetail();
      flushAggregate();

      expect(fixture.nativeElement.querySelector('.btn-follow')).toBeFalsy();
    });
  });

  describe('ratings', () => {
    it('displays ratings aggregate when available', () => {
      createComponent();
      fixture.detectChanges();
      flushDetail();
      flushAggregate();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.avg-overall')?.textContent).toContain('4.5');
      expect(el.textContent).toContain('10 reviews');
    });

    it('displays metrics table', () => {
      createComponent();
      fixture.detectChanges();
      flushDetail();
      flushAggregate();

      const rows = fixture.nativeElement.querySelectorAll('.metrics-table tbody tr');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('acting');
      expect(rows[0].textContent).toContain('4.2');
      expect(rows[1].textContent).toContain('plot');
      expect(rows[1].textContent).toContain('4.8');
    });

    it('shows no ratings message when aggregate is null', () => {
      createComponent();
      fixture.detectChanges();
      flushDetail();
      flushAggregate(null);

      expect(fixture.nativeElement.textContent).toContain('No ratings yet');
    });

    it('shows no ratings message on aggregate error', () => {
      createComponent();
      fixture.detectChanges();
      flushDetail();
      flushAggregateError();

      expect(fixture.nativeElement.textContent).toContain('No ratings yet');
    });

    it('shows loading state for ratings', () => {
      createComponent();
      fixture.detectChanges();
      flushDetail();

      expect(fixture.nativeElement.textContent).toContain('Loading ratings');

      flushAggregate();
    });
  });

  describe('authenticated view', () => {
    it('shows Follow button for authenticated user', () => {
      createComponent('user');
      fixture.detectChanges();
      flushDetail();
      flushAggregate();
      flushFollowState(false);

      const btn = fixture.nativeElement.querySelector('.btn-follow');
      expect(btn).toBeTruthy();
      expect(btn.textContent).toContain('Follow');
    });

    it('shows Unfollow when user is already following', () => {
      createComponent('user');
      fixture.detectChanges();
      flushDetail();
      flushAggregate();
      flushFollowState(true);

      const btn = fixture.nativeElement.querySelector('.btn-follow');
      expect(btn.textContent).toContain('Unfollow');
    });

    it('follows subject on click and shows notification', () => {
      createComponent('user');
      fixture.detectChanges();
      flushDetail();
      flushAggregate();
      flushFollowState(false);

      const notification = TestBed.inject(NotificationService);

      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-follow');
      btn.click();

      const req = http.expectOne('/api/follows/subjects/1');
      expect(req.request.method).toBe('POST');
      req.flush(
        envelope({
          followId: 10,
          subjectId: 1,
          subjectName: 'Inception',
          subjectSlug: 'inception',
          followedAtUtc: '2026-03-01T00:00:00Z',
        }),
      );
      fixture.detectChanges();

      expect(fixture.componentInstance.isFollowing()).toBe(true);
      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].type).toBe('success');
    });

    it('unfollows subject on click and shows notification', () => {
      createComponent('user');
      fixture.detectChanges();
      flushDetail();
      flushAggregate();
      flushFollowState(true);

      const notification = TestBed.inject(NotificationService);

      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-follow');
      btn.click();

      const req = http.expectOne('/api/follows/subjects/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope({ followId: 10, removed: true }));
      fixture.detectChanges();

      expect(fixture.componentInstance.isFollowing()).toBe(false);
      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].type).toBe('success');
    });

    it('shows error notification on follow failure', () => {
      createComponent('user');
      fixture.detectChanges();
      flushDetail();
      flushAggregate();
      flushFollowState(false);

      const notification = TestBed.inject(NotificationService);

      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-follow');
      btn.click();

      http
        .expectOne('/api/follows/subjects/1')
        .flush(errorEnvelope('FOLLOW_FAILED', 'Cannot follow'));
      fixture.detectChanges();

      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].type).toBe('danger');
    });

    it('disables button while follow state is loading', () => {
      createComponent('user');
      fixture.detectChanges();
      flushDetail();
      flushAggregate();

      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-follow');
      expect(btn.disabled).toBe(true);

      flushFollowState(false);
      expect(btn.disabled).toBe(false);
    });
  });

  describe('admin view', () => {
    it('shows Edit and Delete buttons for admin', () => {
      createComponent('admin');
      fixture.detectChanges();
      flushDetail();
      flushAggregate();
      flushFollowState(false);

      const editLink = fixture.nativeElement.querySelector('a[href="/admin/subjects/1/edit"]');
      expect(editLink).toBeTruthy();
      expect(editLink.textContent).toContain('Edit');

      const deleteBtn = fixture.nativeElement.querySelector('.btn-delete');
      expect(deleteBtn).toBeTruthy();
      expect(deleteBtn.textContent).toContain('Delete');
    });

    it('shows Back to list link', () => {
      createComponent('admin');
      fixture.detectChanges();
      flushDetail();
      flushAggregate();
      flushFollowState(false);

      const backLink = fixture.nativeElement.querySelector('a[href="/subjects"]');
      expect(backLink).toBeTruthy();
      expect(backLink.textContent).toContain('Back');
    });

    it('shows confirmation with warning when Delete is clicked', () => {
      createComponent('admin');
      fixture.detectChanges();
      flushDetail();
      flushAggregate();
      flushFollowState(false);

      const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('associated reviews');
      expect(el.querySelector('.btn-confirm-delete')).toBeTruthy();
      expect(el.querySelector('.btn-cancel-delete')).toBeTruthy();
    });

    it('sends DELETE request on confirm and shows notification', () => {
      createComponent('admin');
      fixture.detectChanges();
      flushDetail();
      flushAggregate();
      flushFollowState(false);

      const notification = TestBed.inject(NotificationService);

      const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      const confirmBtn: HTMLButtonElement =
        fixture.nativeElement.querySelector('.btn-confirm-delete');
      confirmBtn.click();

      const req = http.expectOne('/api/subjects/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope({ id: 1, deleted: true }));

      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].type).toBe('success');
      expect(notification.notifications()[0].message).toContain('deleted');
    });

    it('hides confirmation when Cancel is clicked', () => {
      createComponent('admin');
      fixture.detectChanges();
      flushDetail();
      flushAggregate();
      flushFollowState(false);

      const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      const cancelBtn: HTMLButtonElement =
        fixture.nativeElement.querySelector('.btn-cancel-delete');
      cancelBtn.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.btn-confirm-delete')).toBeFalsy();
      expect(fixture.nativeElement.querySelector('.btn-delete')).toBeTruthy();
    });

    it('shows error on delete failure', () => {
      createComponent('admin');
      fixture.detectChanges();
      flushDetail();
      flushAggregate();
      flushFollowState(false);

      const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      const confirmBtn: HTMLButtonElement =
        fixture.nativeElement.querySelector('.btn-confirm-delete');
      confirmBtn.click();

      http
        .expectOne('/api/subjects/1')
        .flush(errorEnvelope('SUBJECT_DELETE_FAILED', 'Cannot delete subject'));
      fixture.detectChanges();

      expect(fixture.componentInstance.error()).toBe('Cannot delete subject');
    });
  });
});
