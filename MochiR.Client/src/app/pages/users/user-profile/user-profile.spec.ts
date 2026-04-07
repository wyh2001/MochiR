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

  function createProfile(following = false) {
    return {
      public: {
        id: 'user-b-id',
        userName: 'bob',
        displayName: 'Bob Smith',
        avatarUrl: null,
        createdAtUtc: '2026-01-15T12:00:00Z',
        viewerRelationship: {
          userId: 'user-b-id',
          following,
          followId: following ? 1 : null,
          followedAtUtc: following ? '2026-02-01T00:00:00Z' : null,
        },
      },
      sensitive: null,
    };
  }

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

  it('fetches profile on init via GET /api/users/{id}', () => {
    createComponent('user-b-id');
    fixture.detectChanges();

    const req = http.expectOne('/api/users/user-b-id');
    expect(req.request.method).toBe('GET');
    req.flush(envelope(createProfile()));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Bob Smith');
    expect(el.textContent).toContain('@bob');
  });

  it('displays avatar placeholder with initial when no avatar', () => {
    createComponent('user-b-id');
    fixture.detectChanges();

    http.expectOne('/api/users/user-b-id').flush(envelope(createProfile()));
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
      ...createProfile(),
      public: {
        ...createProfile().public,
        avatarUrl: 'https://example.com/bob.jpg',
      },
    };
    http.expectOne('/api/users/user-b-id').flush(envelope(profileWithAvatar));
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.src).toContain('bob.jpg');
  });

  it('redirects to /profile when viewing own profile', () => {
    createComponent('user-a-id', 'user-a-id');
    fixture.detectChanges();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/profile');
    http.expectNone('/api/users/user-a-id');
  });

  it('shows Follow when viewerRelationship indicates not following', () => {
    createComponent('user-b-id');
    fixture.detectChanges();

    http.expectOne('/api/users/user-b-id').flush(envelope(createProfile(false)));
    fixture.detectChanges();

    const followBtn = fixture.nativeElement.querySelector('.btn-follow');
    expect(followBtn?.textContent?.trim()).toBe('Follow');
  });

  it('shows Unfollow when viewerRelationship indicates following', () => {
    createComponent('user-b-id');
    fixture.detectChanges();

    http.expectOne('/api/users/user-b-id').flush(envelope(createProfile(true)));
    fixture.detectChanges();

    const followBtn = fixture.nativeElement.querySelector('.btn-follow');
    expect(followBtn?.textContent?.trim()).toBe('Unfollow');
  });

  it('keeps the follow button enabled once the profile has loaded', () => {
    createComponent('user-b-id');
    fixture.detectChanges();

    http.expectOne('/api/users/user-b-id').flush(envelope(createProfile(false)));
    fixture.detectChanges();

    const followBtn = fixture.nativeElement.querySelector('.btn-follow') as HTMLButtonElement;
    expect(followBtn.disabled).toBe(false);
  });

  it('sends POST on Follow click and updates the button state', () => {
    createComponent('user-b-id');
    fixture.detectChanges();

    http.expectOne('/api/users/user-b-id').flush(envelope(createProfile(false)));
    fixture.detectChanges();

    const notification = TestBed.inject(NotificationService);
    const followBtn = fixture.nativeElement.querySelector('.btn-follow') as HTMLButtonElement;
    followBtn.click();

    const req = http.expectOne('/api/follows/users/user-b-id');
    expect(req.request.method).toBe('POST');
    req.flush(
      envelope({
        userId: 'user-b-id',
        following: true,
        followId: 1,
        followedAtUtc: '2026-03-01T10:00:00Z',
      }),
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.isFollowing()).toBe(true);
    expect(notification.notifications().at(-1)?.type).toBe('success');
  });

  it('sends DELETE on Unfollow click and updates the button state', () => {
    createComponent('user-b-id');
    fixture.detectChanges();

    http.expectOne('/api/users/user-b-id').flush(envelope(createProfile(true)));
    fixture.detectChanges();

    const notification = TestBed.inject(NotificationService);
    const followBtn = fixture.nativeElement.querySelector('.btn-follow') as HTMLButtonElement;
    followBtn.click();

    const req = http.expectOne('/api/follows/users/user-b-id');
    expect(req.request.method).toBe('DELETE');
    req.flush(
      envelope({
        userId: 'user-b-id',
        following: false,
        followId: null,
        followedAtUtc: null,
      }),
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.isFollowing()).toBe(false);
    expect(notification.notifications().at(-1)?.type).toBe('success');
  });

  it('shows API error message when the profile cannot be loaded', () => {
    createComponent('nonexistent-id');
    fixture.detectChanges();

    http
      .expectOne('/api/users/nonexistent-id')
      .flush(errorEnvelope('USER_NOT_FOUND', 'User not found'));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('User not found');
  });
});
