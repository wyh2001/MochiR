import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { UserProfilePage } from './user-profile';
import { apiResponseInterceptor } from '../../../core/interceptors/api-response.interceptor';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';

describe('UserProfilePage', () => {
  let fixture: ComponentFixture<UserProfilePage>;
  let http: HttpTestingController;
  let authState: AuthStateService;
  let router: Router;

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

  const mockProfile = {
    public: {
      id: 'user-b-id',
      userName: 'bob',
      displayName: 'Bob Smith',
      avatarUrl: null,
      createdAtUtc: '2026-01-15T12:00:00Z',
    },
    sensitive: null,
  };

  const mockFollowingPage = {
    totalCount: 0,
    page: 1,
    pageSize: 50,
    items: [],
  };

  function createComponent(routeUserId: string, currentUserId = 'user-a-id') {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [UserProfilePage],
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: routeUserId }),
            snapshot: { params: { id: routeUserId } },
          },
        },
      ],
    });

    authState = TestBed.inject(AuthStateService);
    authState.setUser({
      id: currentUserId,
      userName: 'alice',
      displayName: 'Alice',
      email: 'alice@test.com',
      isAdmin: false,
    });

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl');

    fixture = TestBed.createComponent(UserProfilePage);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => http.verify());

  describe('view mode', () => {
    it('fetches profile on init via GET /api/users/{id}', () => {
      createComponent('user-b-id');
      fixture.detectChanges();

      const req = http.expectOne('/api/users/user-b-id');
      expect(req.request.method).toBe('GET');
      req.flush(envelope(mockProfile));

      http.expectOne('/api/follows/users?Page=1&PageSize=50').flush(envelope(mockFollowingPage));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Bob Smith');
    });

    it('displays avatar placeholder with initial when no avatar', () => {
      createComponent('user-b-id');
      fixture.detectChanges();

      http.expectOne('/api/users/user-b-id').flush(envelope(mockProfile));
      http.expectOne('/api/follows/users?Page=1&PageSize=50').flush(envelope(mockFollowingPage));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const placeholder = el.querySelector('.avatar-placeholder');
      expect(placeholder).toBeTruthy();
      expect(placeholder!.textContent?.trim()).toBe('B');
    });

    it('displays avatar image when avatarUrl is set', () => {
      createComponent('user-b-id');
      fixture.detectChanges();

      const profileWithAvatar = {
        ...mockProfile,
        public: { ...mockProfile.public, avatarUrl: 'https://example.com/bob.jpg' },
      };
      http.expectOne('/api/users/user-b-id').flush(envelope(profileWithAvatar));
      http.expectOne('/api/follows/users?Page=1&PageSize=50').flush(envelope(mockFollowingPage));
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('img');
      expect(img).toBeTruthy();
      expect(img.src).toContain('bob.jpg');
    });

    it('displays userName, displayName, and join date', () => {
      createComponent('user-b-id');
      fixture.detectChanges();

      http.expectOne('/api/users/user-b-id').flush(envelope(mockProfile));
      http.expectOne('/api/follows/users?Page=1&PageSize=50').flush(envelope(mockFollowingPage));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Bob Smith');
      expect(el.textContent).toContain('@bob');
      expect(el.textContent).toContain('2026-01-15');
    });

    it('shows loading state before API responds', () => {
      createComponent('user-b-id');
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Loading');

      http.expectOne('/api/users/user-b-id').flush(envelope(mockProfile));
      http.expectOne('/api/follows/users?Page=1&PageSize=50').flush(envelope(mockFollowingPage));
    });

    it('shows "User not found" error with back link on 404', () => {
      createComponent('nonexistent-id');
      fixture.detectChanges();

      http
        .expectOne('/api/users/nonexistent-id')
        .flush(errorEnvelope('USER_NOT_FOUND', 'User not found'));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('User not found');
      const backLink = el.querySelector('a');
      expect(backLink).toBeTruthy();
    });

    it('shows generic error with back link on network failure', () => {
      createComponent('user-b-id');
      fixture.detectChanges();

      http.expectOne('/api/users/user-b-id').flush('', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('a')).toBeTruthy();
    });

    it('redirects to /profile when viewing own profile', () => {
      createComponent('user-a-id', 'user-a-id');
      fixture.detectChanges();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/profile');

      // No API calls should have been made
      http.expectNone('/api/users/user-a-id');
    });
  });

  describe('follow state detection', () => {
    it('shows "Follow" button when not following the user', () => {
      createComponent('user-b-id');
      fixture.detectChanges();

      http.expectOne('/api/users/user-b-id').flush(envelope(mockProfile));
      http.expectOne('/api/follows/users?Page=1&PageSize=50').flush(envelope(mockFollowingPage));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const followBtn = el.querySelector('.btn-follow');
      expect(followBtn).toBeTruthy();
      expect(followBtn!.textContent?.trim()).toBe('Follow');
    });

    it('shows "Unfollow" button when already following the user', () => {
      createComponent('user-b-id');
      fixture.detectChanges();

      http.expectOne('/api/users/user-b-id').flush(envelope(mockProfile));
      http.expectOne('/api/follows/users?Page=1&PageSize=50').flush(
        envelope({
          totalCount: 1,
          page: 1,
          pageSize: 50,
          items: [
            {
              followId: 1,
              userId: 'user-b-id',
              userName: 'bob',
              displayName: 'Bob Smith',
              avatarUrl: null,
              followedAtUtc: '2026-02-01T00:00:00Z',
            },
          ],
        }),
      );
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const followBtn = el.querySelector('.btn-follow');
      expect(followBtn).toBeTruthy();
      expect(followBtn!.textContent?.trim()).toBe('Unfollow');
    });

    it('disables follow button while follow state is loading', () => {
      createComponent('user-b-id');
      fixture.detectChanges();

      http.expectOne('/api/users/user-b-id').flush(envelope(mockProfile));
      // Don't flush following list yet — it's still loading
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const followBtn = el.querySelector('.btn-follow') as HTMLButtonElement | null;
      if (followBtn) {
        expect(followBtn.disabled).toBe(true);
      }

      http.expectOne('/api/follows/users?Page=1&PageSize=50').flush(envelope(mockFollowingPage));
    });
  });

  describe('follow/unfollow actions', () => {
    it('sends POST on Follow click and changes button to Unfollow with notification', () => {
      createComponent('user-b-id');
      fixture.detectChanges();

      http.expectOne('/api/users/user-b-id').flush(envelope(mockProfile));
      http.expectOne('/api/follows/users?Page=1&PageSize=50').flush(envelope(mockFollowingPage));
      fixture.detectChanges();

      const followBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-follow');
      expect(followBtn.textContent?.trim()).toBe('Follow');

      followBtn.click();

      const req = http.expectOne('/api/follows/users/user-b-id');
      expect(req.request.method).toBe('POST');
      req.flush(
        envelope({
          followId: 1,
          userId: 'user-b-id',
          userName: 'bob',
          displayName: 'Bob Smith',
          avatarUrl: null,
          followedAtUtc: '2026-03-01T10:00:00Z',
        }),
      );
      fixture.detectChanges();

      expect(followBtn.textContent?.trim()).toBe('Unfollow');

      const notification = TestBed.inject(NotificationService);
      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].type).toBe('success');
    });

    it('sends DELETE on Unfollow click and changes button to Follow with notification', () => {
      createComponent('user-b-id');
      fixture.detectChanges();

      http.expectOne('/api/users/user-b-id').flush(envelope(mockProfile));
      http.expectOne('/api/follows/users?Page=1&PageSize=50').flush(
        envelope({
          totalCount: 1,
          page: 1,
          pageSize: 50,
          items: [
            {
              followId: 1,
              userId: 'user-b-id',
              userName: 'bob',
              displayName: 'Bob Smith',
              avatarUrl: null,
              followedAtUtc: '2026-02-01T00:00:00Z',
            },
          ],
        }),
      );
      fixture.detectChanges();

      const followBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-follow');
      expect(followBtn.textContent?.trim()).toBe('Unfollow');

      followBtn.click();

      const req = http.expectOne('/api/follows/users/user-b-id');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope({ followId: 1, removed: true }));
      fixture.detectChanges();

      expect(followBtn.textContent?.trim()).toBe('Follow');

      const notification = TestBed.inject(NotificationService);
      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].type).toBe('success');
    });

    it('disables button during follow action', () => {
      createComponent('user-b-id');
      fixture.detectChanges();

      http.expectOne('/api/users/user-b-id').flush(envelope(mockProfile));
      http.expectOne('/api/follows/users?Page=1&PageSize=50').flush(envelope(mockFollowingPage));
      fixture.detectChanges();

      const followBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-follow');
      followBtn.click();
      fixture.detectChanges();

      expect(followBtn.disabled).toBe(true);

      http.expectOne('/api/follows/users/user-b-id').flush(
        envelope({
          followId: 1,
          userId: 'user-b-id',
          userName: 'bob',
          displayName: 'Bob Smith',
          avatarUrl: null,
          followedAtUtc: '2026-03-01T10:00:00Z',
        }),
      );
      fixture.detectChanges();

      expect(followBtn.disabled).toBe(false);
    });

    it('shows error notification and keeps Follow button on follow error', () => {
      createComponent('user-b-id');
      fixture.detectChanges();

      http.expectOne('/api/users/user-b-id').flush(envelope(mockProfile));
      http.expectOne('/api/follows/users?Page=1&PageSize=50').flush(envelope(mockFollowingPage));
      fixture.detectChanges();

      const followBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-follow');
      followBtn.click();

      http
        .expectOne('/api/follows/users/user-b-id')
        .flush(errorEnvelope('FOLLOW_FAILED', 'Cannot follow user'));
      fixture.detectChanges();

      expect(followBtn.textContent?.trim()).toBe('Follow');

      const notification = TestBed.inject(NotificationService);
      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].type).toBe('danger');
    });

    it('shows error notification and keeps Unfollow button on unfollow error', () => {
      createComponent('user-b-id');
      fixture.detectChanges();

      http.expectOne('/api/users/user-b-id').flush(envelope(mockProfile));
      http.expectOne('/api/follows/users?Page=1&PageSize=50').flush(
        envelope({
          totalCount: 1,
          page: 1,
          pageSize: 50,
          items: [
            {
              followId: 1,
              userId: 'user-b-id',
              userName: 'bob',
              displayName: 'Bob Smith',
              avatarUrl: null,
              followedAtUtc: '2026-02-01T00:00:00Z',
            },
          ],
        }),
      );
      fixture.detectChanges();

      const followBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-follow');
      expect(followBtn.textContent?.trim()).toBe('Unfollow');

      followBtn.click();

      http
        .expectOne('/api/follows/users/user-b-id')
        .flush(errorEnvelope('UNFOLLOW_FAILED', 'Cannot unfollow user'));
      fixture.detectChanges();

      expect(followBtn.textContent?.trim()).toBe('Unfollow');

      const notification = TestBed.inject(NotificationService);
      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].type).toBe('danger');
    });

    it('uses userName as display name when displayName is null', () => {
      createComponent('user-c-id');
      fixture.detectChanges();

      const profileNullDisplay = {
        public: {
          id: 'user-c-id',
          userName: 'charlie',
          displayName: null,
          avatarUrl: null,
          createdAtUtc: '2026-01-15T12:00:00Z',
        },
        sensitive: null,
      };
      http.expectOne('/api/users/user-c-id').flush(envelope(profileNullDisplay));
      http.expectOne('/api/follows/users?Page=1&PageSize=50').flush(envelope(mockFollowingPage));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('charlie');

      const placeholder = el.querySelector('.avatar-placeholder');
      expect(placeholder).toBeTruthy();
      expect(placeholder!.textContent?.trim()).toBe('C');
    });
  });
});
