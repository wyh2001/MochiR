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

  const subjectPage = (page: number, totalCount = 1) => ({
    totalCount,
    page,
    pageSize: 20,
    items: [
      {
        followId: page,
        subjectId: 40 + page,
        subjectName: `Subject ${page}`,
        subjectSlug: `subject-${page}`,
        followedAtUtc: '2026-02-01T00:00:00Z',
      },
    ],
  });

  const subjectTypePage = {
    totalCount: 1,
    page: 1,
    pageSize: 20,
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

  const userPage = {
    totalCount: 1,
    page: 1,
    pageSize: 20,
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

  it('loads the first subjects page on init', () => {
    fixture.detectChanges();
    http.expectOne('/api/follows/subjects?Page=1&PageSize=20').flush(envelope(subjectPage(1)));
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Subject 1');
  });

  it('switches to subject types and loads the first page for that tab', () => {
    fixture.detectChanges();
    http.expectOne('/api/follows/subjects?Page=1&PageSize=20').flush(envelope(subjectPage(1)));
    fixture.detectChanges();

    const tabBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.tab-subject-types');
    tabBtn.click();

    http
      .expectOne('/api/follows/subject-types?Page=1&PageSize=20')
      .flush(envelope(subjectTypePage));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Movie');
  });

  it('switches to users and loads the first page for that tab', () => {
    fixture.detectChanges();
    http.expectOne('/api/follows/subjects?Page=1&PageSize=20').flush(envelope(subjectPage(1)));
    fixture.detectChanges();

    const tabBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.tab-users');
    tabBtn.click();

    http.expectOne('/api/follows/users?Page=1&PageSize=20').flush(envelope(userPage));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Bob Smith');
  });

  it('loads the next page for the active tab', () => {
    fixture.detectChanges();
    http.expectOne('/api/follows/subjects?Page=1&PageSize=20').flush(envelope(subjectPage(1, 40)));
    fixture.detectChanges();

    fixture.componentInstance.onNextPage();

    http.expectOne('/api/follows/subjects?Page=2&PageSize=20').flush(envelope(subjectPage(2, 40)));
    fixture.detectChanges();

    expect(fixture.componentInstance.currentPage()).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Subject 2');
  });

  it('reloads the current tab after unfollowing', () => {
    fixture.detectChanges();
    http.expectOne('/api/follows/subjects?Page=1&PageSize=20').flush(envelope(subjectPage(1)));
    fixture.detectChanges();

    const notification = TestBed.inject(NotificationService);
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-unfollow');
    btn.click();

    const deleteReq = http.expectOne('/api/follows/subjects/41');
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(
      envelope({
        subjectId: 41,
        following: false,
        followId: null,
        followedAtUtc: null,
      }),
    );

    http
      .expectOne('/api/follows/subjects?Page=1&PageSize=20')
      .flush(envelope({ totalCount: 0, page: 1, pageSize: 20, items: [] }));
    fixture.detectChanges();

    expect(fixture.componentInstance.subjects().length).toBe(0);
    expect(notification.notifications().at(-1)?.type).toBe('success');
  });

  it('moves back to the previous page when removing the last item on the last page', () => {
    fixture.detectChanges();
    http.expectOne('/api/follows/subjects?Page=1&PageSize=20').flush(envelope(subjectPage(1, 21)));
    fixture.detectChanges();

    fixture.componentInstance.onNextPage();
    http.expectOne('/api/follows/subjects?Page=2&PageSize=20').flush(
      envelope({
        totalCount: 21,
        page: 2,
        pageSize: 20,
        items: [
          {
            followId: 21,
            subjectId: 99,
            subjectName: 'Last Subject',
            subjectSlug: 'last-subject',
            followedAtUtc: '2026-02-01T00:00:00Z',
          },
        ],
      }),
    );
    fixture.detectChanges();

    const unfollowBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-unfollow');
    unfollowBtn.click();
    http.expectOne('/api/follows/subjects/99').flush(
      envelope({
        subjectId: 99,
        following: false,
        followId: null,
        followedAtUtc: null,
      }),
    );

    http.expectOne('/api/follows/subjects?Page=1&PageSize=20').flush(envelope(subjectPage(1, 20)));
    fixture.detectChanges();

    expect(fixture.componentInstance.currentPage()).toBe(1);
  });
});
