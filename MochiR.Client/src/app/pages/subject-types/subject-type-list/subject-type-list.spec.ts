import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SubjectTypeList } from './subject-type-list';
import { apiResponseInterceptor } from '../../../core/interceptors/api-response.interceptor';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthStateService } from '../../../core/services/auth-state.service';

describe('SubjectTypeList', () => {
  let fixture: ComponentFixture<SubjectTypeList>;
  let http: HttpTestingController;
  let authState: AuthStateService;

  function createComponent(role: 'anon' | 'user' | 'admin' = 'anon') {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SubjectTypeList],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
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

    fixture = TestBed.createComponent(SubjectTypeList);
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

  function flushList(data: unknown[]) {
    http.expectOne('/api/subject-types').flush(envelope(data));
    fixture.detectChanges();
  }

  function flushFollowState(followedIds: number[] = []) {
    const page = {
      totalCount: followedIds.length,
      page: 1,
      pageSize: 50,
      items: followedIds.map((id) => ({
        followId: id,
        subjectTypeId: id,
        subjectTypeKey: `type-${id}`,
        subjectTypeDisplayName: `Type ${id}`,
        followedAtUtc: '2026-02-01T00:00:00Z',
      })),
    };
    http.expectOne('/api/follows/subject-types?Page=1&PageSize=50').flush(envelope(page));
    fixture.detectChanges();
  }

  describe('public view', () => {
    it('renders a table with subject types', () => {
      createComponent();
      fixture.detectChanges();
      flushList([
        { id: 1, key: 'movie', displayName: 'Movie' },
        { id: 2, key: 'book', displayName: 'Book' },
      ]);

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('movie');
      expect(rows[0].textContent).toContain('Movie');
      expect(rows[1].textContent).toContain('book');
    });

    it('shows empty state when no subject types exist', () => {
      createComponent();
      fixture.detectChanges();
      flushList([]);

      expect(fixture.nativeElement.textContent).toContain('No subject types found');
    });

    it('shows loading state while fetching', () => {
      createComponent();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Loading');

      flushList([]);
    });

    it('does not show Create button for non-admin', () => {
      createComponent('anon');
      fixture.detectChanges();
      flushList([]);

      const link = fixture.nativeElement.querySelector('a[href="/admin/subject-types/new"]');
      expect(link).toBeFalsy();
    });

    it('does not show Actions column for non-admin', () => {
      createComponent('anon');
      fixture.detectChanges();
      flushList([{ id: 1, key: 'movie', displayName: 'Movie' }]);

      const headers = fixture.nativeElement.querySelectorAll('thead th');
      const texts = Array.from(headers).map((h: unknown) => (h as HTMLElement).textContent);
      expect(texts).not.toContain('Actions');
    });

    it('does not show Follow column for unauthenticated user', () => {
      createComponent('anon');
      fixture.detectChanges();
      flushList([{ id: 1, key: 'movie', displayName: 'Movie' }]);

      const headers = fixture.nativeElement.querySelectorAll('thead th');
      const texts = Array.from(headers).map((h: unknown) => (h as HTMLElement).textContent);
      expect(texts).not.toContain('Follow');
    });
  });

  describe('authenticated view', () => {
    it('shows Follow column and buttons for authenticated user', () => {
      createComponent('user');
      fixture.detectChanges();
      flushList([{ id: 1, key: 'movie', displayName: 'Movie' }]);
      flushFollowState([]);

      const headers = fixture.nativeElement.querySelectorAll('thead th');
      const texts = Array.from(headers).map((h: unknown) => (h as HTMLElement).textContent);
      expect(texts).toContain('Follow');

      const btn = fixture.nativeElement.querySelector('.btn-follow');
      expect(btn).toBeTruthy();
      expect(btn.textContent).toContain('Follow');
    });

    it('shows Unfollow for already followed types', () => {
      createComponent('user');
      fixture.detectChanges();
      flushList([
        { id: 1, key: 'movie', displayName: 'Movie' },
        { id: 2, key: 'book', displayName: 'Book' },
      ]);
      flushFollowState([1]);

      const buttons = fixture.nativeElement.querySelectorAll('.btn-follow');
      expect(buttons[0].textContent).toContain('Unfollow');
      expect(buttons[1].textContent).toContain('Follow');
    });

    it('follows subject type on click', () => {
      createComponent('user');
      fixture.detectChanges();
      flushList([{ id: 1, key: 'movie', displayName: 'Movie' }]);
      flushFollowState([]);

      const notification = TestBed.inject(NotificationService);

      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-follow');
      btn.click();

      const req = http.expectOne('/api/follows/subject-types/1');
      expect(req.request.method).toBe('POST');
      req.flush(
        envelope({
          followId: 10,
          subjectTypeId: 1,
          subjectTypeKey: 'movie',
          subjectTypeDisplayName: 'Movie',
          followedAtUtc: '2026-03-01T00:00:00Z',
        }),
      );
      fixture.detectChanges();

      expect(fixture.componentInstance.followedTypeIds().has(1)).toBe(true);
      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].type).toBe('success');
    });

    it('unfollows subject type on click', () => {
      createComponent('user');
      fixture.detectChanges();
      flushList([{ id: 1, key: 'movie', displayName: 'Movie' }]);
      flushFollowState([1]);

      const notification = TestBed.inject(NotificationService);

      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-follow');
      btn.click();

      const req = http.expectOne('/api/follows/subject-types/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope({ followId: 10, removed: true }));
      fixture.detectChanges();

      expect(fixture.componentInstance.followedTypeIds().has(1)).toBe(false);
      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].type).toBe('success');
    });

    it('disables button while follow state is loading', () => {
      createComponent('user');
      fixture.detectChanges();
      flushList([{ id: 1, key: 'movie', displayName: 'Movie' }]);

      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-follow');
      expect(btn.disabled).toBe(true);

      flushFollowState([]);
      expect(btn.disabled).toBe(false);
    });
  });

  describe('admin view', () => {
    it('shows Create button for admin', () => {
      createComponent('admin');
      fixture.detectChanges();
      flushList([]);
      flushFollowState([]);

      const link = fixture.nativeElement.querySelector('a[href="/admin/subject-types/new"]');
      expect(link).toBeTruthy();
      expect(link.textContent).toContain('Create');
    });

    it('shows Edit and Delete buttons per row', () => {
      createComponent('admin');
      fixture.detectChanges();
      flushList([{ id: 1, key: 'movie', displayName: 'Movie' }]);
      flushFollowState([]);

      const row = fixture.nativeElement.querySelector('tbody tr');
      expect(row.textContent).toContain('Edit');
      expect(row.textContent).toContain('Delete');
    });

    it('shows inline confirmation when Delete is clicked', () => {
      createComponent('admin');
      fixture.detectChanges();
      flushList([
        { id: 1, key: 'movie', displayName: 'Movie' },
        { id: 2, key: 'book', displayName: 'Book' },
      ]);
      flushFollowState([]);

      const deleteBtn = fixture.nativeElement.querySelector('.btn-outline-danger');
      deleteBtn.click();
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('tbody tr');
      expect(row.textContent).toContain('Are you sure?');
      expect(row.textContent).toContain('Confirm');
      expect(row.textContent).toContain('Cancel');
    });

    it('hides confirmation when Cancel is clicked', () => {
      createComponent('admin');
      fixture.detectChanges();
      flushList([{ id: 1, key: 'movie', displayName: 'Movie' }]);
      flushFollowState([]);

      const deleteBtn = fixture.nativeElement.querySelector('.btn-outline-danger');
      deleteBtn.click();
      fixture.detectChanges();

      const cancelBtn = fixture.nativeElement.querySelector('.btn-secondary');
      cancelBtn.click();
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('tbody tr');
      expect(row.textContent).not.toContain('Are you sure?');
      expect(row.textContent).toContain('Delete');
    });

    it('calls DELETE API and removes row on confirm', () => {
      createComponent('admin');
      fixture.detectChanges();
      flushList([
        { id: 1, key: 'movie', displayName: 'Movie' },
        { id: 2, key: 'book', displayName: 'Book' },
      ]);
      flushFollowState([]);

      const deleteBtn = fixture.nativeElement.querySelector('.btn-outline-danger');
      deleteBtn.click();
      fixture.detectChanges();

      const confirmBtn = fixture.nativeElement.querySelector('.btn-danger');
      confirmBtn.click();

      const req = http.expectOne('/api/subject-types/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope({ id: 1, deleted: true }));

      flushList([{ id: 2, key: 'book', displayName: 'Book' }]);

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('book');
    });

    it('shows error notification on delete failure', () => {
      createComponent('admin');
      fixture.detectChanges();
      flushList([{ id: 1, key: 'movie', displayName: 'Movie' }]);
      flushFollowState([]);

      const deleteBtn = fixture.nativeElement.querySelector('.btn-outline-danger');
      deleteBtn.click();
      fixture.detectChanges();

      const confirmBtn = fixture.nativeElement.querySelector('.btn-danger');
      confirmBtn.click();

      http.expectOne('/api/subject-types/1').flush({
        success: false,
        data: null,
        error: { code: 'DELETE_FAILED', message: 'Cannot delete', details: null },
        traceId: '',
        timestampUtc: '',
      });
      fixture.detectChanges();

      const notificationService = TestBed.inject(NotificationService);
      expect(notificationService.notifications().length).toBe(1);
      expect(notificationService.notifications()[0].type).toBe('danger');
    });
  });
});
