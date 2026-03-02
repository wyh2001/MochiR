import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { FollowsPage } from './follows-page';
import { apiResponseInterceptor } from '../../../core/interceptors/api-response.interceptor';
import { NotificationService } from '../../../core/services/notification.service';

describe('FollowsPage', () => {
  let fixture: ComponentFixture<FollowsPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FollowsPage],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    fixture = TestBed.createComponent(FollowsPage);
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

  const mockSubjectsPage = {
    totalCount: 1,
    page: 1,
    pageSize: 50,
    items: [
      {
        followId: 1,
        subjectId: 42,
        subjectName: 'Inception',
        subjectSlug: 'inception',
        followedAtUtc: '2026-02-01T00:00:00Z',
      },
    ],
  };

  const mockSubjectTypesPage = {
    totalCount: 1,
    page: 1,
    pageSize: 50,
    items: [
      {
        followId: 2,
        subjectTypeId: 5,
        subjectTypeKey: 'movie',
        subjectTypeDisplayName: 'Movie',
        followedAtUtc: '2026-02-01T00:00:00Z',
      },
    ],
  };

  const mockUsersPage = {
    totalCount: 1,
    page: 1,
    pageSize: 50,
    items: [
      {
        followId: 3,
        userId: 'user-b-id',
        userName: 'bob',
        displayName: 'Bob Smith',
        avatarUrl: null,
        followedAtUtc: '2026-02-01T00:00:00Z',
      },
    ],
  };

  describe('subjects tab', () => {
    it('loads subjects on init', () => {
      fixture.detectChanges();
      http.expectOne('/api/follows/subjects?Page=1&PageSize=50').flush(envelope(mockSubjectsPage));
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Inception');
      expect(el.textContent).toContain('inception');
    });

    it('shows empty state when no subjects followed', () => {
      fixture.detectChanges();
      http
        .expectOne('/api/follows/subjects?Page=1&PageSize=50')
        .flush(envelope({ totalCount: 0, page: 1, pageSize: 50, items: [] }));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('not following any subjects');
    });

    it('unfollows a subject and removes it from the list', () => {
      fixture.detectChanges();
      http.expectOne('/api/follows/subjects?Page=1&PageSize=50').flush(envelope(mockSubjectsPage));
      fixture.detectChanges();

      const notification = TestBed.inject(NotificationService);

      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-unfollow');
      btn.click();

      const req = http.expectOne('/api/follows/subjects/42');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope({ followId: 1, removed: true }));
      fixture.detectChanges();

      expect(fixture.componentInstance.subjects().length).toBe(0);
      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].type).toBe('success');
    });
  });

  describe('subject-types tab', () => {
    it('loads subject types when tab is switched', () => {
      fixture.detectChanges();
      http.expectOne('/api/follows/subjects?Page=1&PageSize=50').flush(envelope(mockSubjectsPage));
      fixture.detectChanges();

      const tabBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.tab-subject-types');
      tabBtn.click();

      http
        .expectOne('/api/follows/subject-types?Page=1&PageSize=50')
        .flush(envelope(mockSubjectTypesPage));
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('movie');
      expect(el.textContent).toContain('Movie');
    });

    it('unfollows a subject type and removes it from the list', () => {
      fixture.detectChanges();
      http.expectOne('/api/follows/subjects?Page=1&PageSize=50').flush(envelope(mockSubjectsPage));
      fixture.detectChanges();

      fixture.componentInstance.switchTab('subject-types');
      http
        .expectOne('/api/follows/subject-types?Page=1&PageSize=50')
        .flush(envelope(mockSubjectTypesPage));
      fixture.detectChanges();

      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-unfollow');
      btn.click();

      const req = http.expectOne('/api/follows/subject-types/5');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope({ followId: 2, removed: true }));
      fixture.detectChanges();

      expect(fixture.componentInstance.subjectTypes().length).toBe(0);
    });
  });

  describe('users tab', () => {
    it('loads users when tab is switched', () => {
      fixture.detectChanges();
      http.expectOne('/api/follows/subjects?Page=1&PageSize=50').flush(envelope(mockSubjectsPage));
      fixture.detectChanges();

      const tabBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.tab-users');
      tabBtn.click();

      http.expectOne('/api/follows/users?Page=1&PageSize=50').flush(envelope(mockUsersPage));
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('bob');
      expect(el.textContent).toContain('Bob Smith');
    });

    it('unfollows a user and removes it from the list', () => {
      fixture.detectChanges();
      http.expectOne('/api/follows/subjects?Page=1&PageSize=50').flush(envelope(mockSubjectsPage));
      fixture.detectChanges();

      fixture.componentInstance.switchTab('users');
      http.expectOne('/api/follows/users?Page=1&PageSize=50').flush(envelope(mockUsersPage));
      fixture.detectChanges();

      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-unfollow');
      btn.click();

      const req = http.expectOne('/api/follows/users/user-b-id');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope({ followId: 3, removed: true }));
      fixture.detectChanges();

      expect(fixture.componentInstance.users().length).toBe(0);
    });
  });

  it('shows loading state', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading');

    http.expectOne('/api/follows/subjects?Page=1&PageSize=50').flush(envelope(mockSubjectsPage));
    fixture.detectChanges();
  });

  it('highlights active tab', () => {
    fixture.detectChanges();
    http.expectOne('/api/follows/subjects?Page=1&PageSize=50').flush(envelope(mockSubjectsPage));
    fixture.detectChanges();

    const subjectsTab = fixture.nativeElement.querySelector('.tab-subjects');
    expect(subjectsTab.classList).toContain('active');
  });
});
