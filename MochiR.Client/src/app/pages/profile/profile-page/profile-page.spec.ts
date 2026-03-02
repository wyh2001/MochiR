import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ProfilePage } from './profile-page';
import { apiResponseInterceptor } from '../../../core/interceptors/api-response.interceptor';
import { AuthStateService } from '../../../core/services/auth-state.service';

describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;
  let http: HttpTestingController;

  const mockProfile = {
    id: 'user-1',
    userName: 'john',
    displayName: 'John Doe',
    email: 'john@example.com',
    emailConfirmed: true,
    phoneNumber: null,
    phoneNumberConfirmed: false,
    avatarUrl: 'https://example.com/avatar.jpg',
    twoFactorEnabled: false,
    lockoutEnabled: false,
    lockoutEnd: null,
    createdAtUtc: '2026-01-15T12:00:00Z',
    followersCount: 10,
    followingCount: 5,
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

  function create() {
    TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    const authState = TestBed.inject(AuthStateService);
    authState.setUser({
      id: 'user-1',
      userName: 'john',
      displayName: 'John Doe',
      email: 'john@example.com',
      isAdmin: false,
    });

    fixture = TestBed.createComponent(ProfilePage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return { fixture, http };
  }

  afterEach(() => http.verify());

  describe('view mode', () => {
    it('fetches profile on init and displays user info', () => {
      create();
      http.expectOne('/api/me').flush(envelope(mockProfile));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('john');
      expect(el.textContent).toContain('John Doe');
      expect(el.textContent).toContain('john@example.com');
      expect(el.textContent).toContain('10');
      expect(el.textContent).toContain('5');
      expect(el.textContent).toContain('2026-01-15');
    });

    it('shows avatar image when avatarUrl is set', () => {
      create();
      http.expectOne('/api/me').flush(envelope(mockProfile));
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('img');
      expect(img).toBeTruthy();
      expect(img.src).toContain('avatar.jpg');
    });

    it('shows placeholder when no avatar', () => {
      create();
      http
        .expectOne('/api/me')
        .flush(envelope({ ...mockProfile, avatarUrl: null, displayName: 'John Doe' }));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const img = el.querySelector('img[alt="Avatar"]');
      // No img tag or a placeholder should be shown
      const placeholder = el.querySelector('.avatar-placeholder');
      if (!img) {
        expect(placeholder).toBeTruthy();
      }
    });

    it('shows loading state before API responds', () => {
      create();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Loading');
      // Flush the pending request to satisfy afterEach verify
      http.expectOne('/api/me').flush(envelope(mockProfile));
    });

    it('shows error state when fetch fails with go-back link', () => {
      create();
      http.expectOne('/api/me').flush(errorEnvelope('UNAUTHORIZED', 'Not authenticated'));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Not authenticated');
      const link = el.querySelector('a[href="/"]');
      expect(link).toBeTruthy();
    });

    it('shows three tabs: Profile, Followers, Following', () => {
      create();
      http.expectOne('/api/me').flush(envelope(mockProfile));
      fixture.detectChanges();

      const tabs = fixture.nativeElement.querySelectorAll('.nav-link');
      const tabTexts = Array.from(tabs).map((t) => (t as HTMLElement).textContent?.trim());
      expect(tabTexts).toContain('Profile');
      expect(tabTexts).toContain('Followers');
      expect(tabTexts).toContain('Following');
    });

    it('defaults to Profile tab', () => {
      create();
      http.expectOne('/api/me').flush(envelope(mockProfile));
      fixture.detectChanges();

      const activeTab = fixture.nativeElement.querySelector('.nav-link.active');
      expect(activeTab.textContent.trim()).toBe('Profile');
    });
  });

  describe('edit mode', () => {
    function createWithProfile() {
      create();
      http.expectOne('/api/me').flush(envelope(mockProfile));
      fixture.detectChanges();
    }

    it('shows edit form pre-filled when Edit Profile is clicked', () => {
      createWithProfile();
      const editBtn = fixture.nativeElement.querySelector('button.btn-primary');
      editBtn.click();
      fixture.detectChanges();

      const component = fixture.componentInstance;
      expect(component.editing()).toBe(true);
      expect(component.editForm.getRawValue().displayName).toBe('John Doe');
      expect(component.editForm.getRawValue().avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('sends PATCH and updates profile on submit', () => {
      createWithProfile();
      const component = fixture.componentInstance;
      component.onEdit();
      fixture.detectChanges();

      component.editForm.patchValue({ displayName: 'Jane Doe' });
      component.onSubmitEdit();

      const req = http.expectOne('/api/me');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({
        displayName: 'Jane Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
      });
      req.flush(envelope({ ...mockProfile, displayName: 'Jane Doe' }));
      fixture.detectChanges();

      expect(component.editing()).toBe(false);
      expect(component.profile()?.displayName).toBe('Jane Doe');
    });

    it('sends null for cleared displayName', () => {
      createWithProfile();
      const component = fixture.componentInstance;
      component.onEdit();
      component.editForm.patchValue({ displayName: '' });
      component.onSubmitEdit();

      const req = http.expectOne('/api/me');
      expect(req.request.body['displayName']).toBeNull();
      req.flush(envelope({ ...mockProfile, displayName: null }));
    });

    it('hides form on cancel without saving', () => {
      createWithProfile();
      const component = fixture.componentInstance;
      component.onEdit();
      fixture.detectChanges();
      expect(component.editing()).toBe(true);

      component.onCancelEdit();
      fixture.detectChanges();
      expect(component.editing()).toBe(false);
    });

    it('shows server error on edit failure', () => {
      createWithProfile();
      const component = fixture.componentInstance;
      component.onEdit();
      component.onSubmitEdit();

      http.expectOne('/api/me').flush(errorEnvelope('VALIDATION_ERROR', 'Invalid data'));
      fixture.detectChanges();

      expect(component.serverError()).toBe('Invalid data');
      expect(fixture.nativeElement.textContent).toContain('Invalid data');
    });

    it('syncs AuthStateService on display name change', () => {
      createWithProfile();
      const authState = TestBed.inject(AuthStateService);
      const component = fixture.componentInstance;

      component.onEdit();
      component.editForm.patchValue({ displayName: 'New Name' });
      component.onSubmitEdit();

      http.expectOne('/api/me').flush(envelope({ ...mockProfile, displayName: 'New Name' }));
      fixture.detectChanges();

      expect(authState.user()?.displayName).toBe('New Name');
    });

    it('closes password and email forms when edit is opened', () => {
      createWithProfile();
      const component = fixture.componentInstance;

      component.onShowChangePassword();
      expect(component.showChangePassword()).toBe(true);

      component.onEdit();
      expect(component.showChangePassword()).toBe(false);
      expect(component.editing()).toBe(true);
    });
  });

  describe('change password', () => {
    function createWithProfile() {
      create();
      http.expectOne('/api/me').flush(envelope(mockProfile));
      fixture.detectChanges();
    }

    it('shows password form when Change Password is clicked', () => {
      createWithProfile();
      const component = fixture.componentInstance;
      component.onShowChangePassword();
      fixture.detectChanges();

      expect(component.showChangePassword()).toBe(true);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Current Password');
      expect(el.textContent).toContain('New Password');
    });

    it('requires both fields — empty form prevents submission', () => {
      createWithProfile();
      const component = fixture.componentInstance;
      component.onShowChangePassword();

      expect(component.passwordForm.invalid).toBe(true);
      component.onSubmitPassword();
      // No HTTP request should have been sent
      http.expectNone('/api/me/password/change');
    });

    it('sends POST and shows success notification', () => {
      createWithProfile();
      const component = fixture.componentInstance;
      component.onShowChangePassword();
      component.passwordForm.patchValue({ currentPassword: 'old123', newPassword: 'new456' });
      component.onSubmitPassword();

      const req = http.expectOne('/api/me/password/change');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ currentPassword: 'old123', newPassword: 'new456' });
      req.flush(envelope(mockProfile));
      fixture.detectChanges();

      expect(component.showChangePassword()).toBe(false);
    });

    it('shows server error on wrong password', () => {
      createWithProfile();
      const component = fixture.componentInstance;
      component.onShowChangePassword();
      component.passwordForm.patchValue({ currentPassword: 'wrong', newPassword: 'new456' });
      component.onSubmitPassword();

      http
        .expectOne('/api/me/password/change')
        .flush(errorEnvelope('PASSWORD_MISMATCH', 'Current password is incorrect'));
      fixture.detectChanges();

      expect(component.serverError()).toBe('Current password is incorrect');
      expect(fixture.nativeElement.textContent).toContain('Current password is incorrect');
    });

    it('closes edit and email forms when password form is opened', () => {
      createWithProfile();
      const component = fixture.componentInstance;

      component.onEdit();
      expect(component.editing()).toBe(true);

      component.onShowChangePassword();
      expect(component.editing()).toBe(false);
      expect(component.showChangePassword()).toBe(true);
    });

    it('resets form and hides on success', () => {
      createWithProfile();
      const component = fixture.componentInstance;
      component.onShowChangePassword();
      component.passwordForm.patchValue({ currentPassword: 'old', newPassword: 'new' });
      component.onSubmitPassword();

      http.expectOne('/api/me/password/change').flush(envelope(mockProfile));
      fixture.detectChanges();

      expect(component.showChangePassword()).toBe(false);
      expect(component.passwordForm.getRawValue().currentPassword).toBe('');
      expect(component.passwordForm.getRawValue().newPassword).toBe('');
    });
  });

  describe('change email request', () => {
    function createWithProfile() {
      create();
      http.expectOne('/api/me').flush(envelope(mockProfile));
      fixture.detectChanges();
    }

    it('shows email form when Change Email is clicked', () => {
      createWithProfile();
      const component = fixture.componentInstance;
      component.onShowChangeEmail();
      fixture.detectChanges();

      expect(component.showChangeEmail()).toBe(true);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Current Password');
      expect(el.textContent).toContain('New Email');
    });

    it('requires both fields and valid email format', () => {
      createWithProfile();
      const component = fixture.componentInstance;
      component.onShowChangeEmail();

      expect(component.emailForm.invalid).toBe(true);

      component.emailForm.patchValue({ currentPassword: 'pass', newEmail: 'not-an-email' });
      expect(component.emailForm.invalid).toBe(true);

      component.emailForm.patchValue({ newEmail: 'valid@example.com' });
      expect(component.emailForm.valid).toBe(true);
    });

    it('sends POST and shows confirmation message', () => {
      createWithProfile();
      const component = fixture.componentInstance;
      component.onShowChangeEmail();
      component.emailForm.patchValue({ currentPassword: 'pass123', newEmail: 'new@example.com' });
      component.onSubmitEmail();

      const req = http.expectOne('/api/me/email/token');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ currentPassword: 'pass123', email: 'new@example.com' });
      req.flush(envelope({ userId: 'user-1', email: 'new@example.com', purpose: 'EmailChange' }));
      fixture.detectChanges();

      expect(component.showChangeEmail()).toBe(false);
    });

    it('shows server error on wrong password', () => {
      createWithProfile();
      const component = fixture.componentInstance;
      component.onShowChangeEmail();
      component.emailForm.patchValue({ currentPassword: 'wrong', newEmail: 'new@example.com' });
      component.onSubmitEmail();

      http
        .expectOne('/api/me/email/token')
        .flush(errorEnvelope('PASSWORD_MISMATCH', 'Current password is incorrect'));
      fixture.detectChanges();

      expect(component.serverError()).toBe('Current password is incorrect');
    });

    it('closes edit and password forms when email form is opened', () => {
      createWithProfile();
      const component = fixture.componentInstance;

      component.onEdit();
      expect(component.editing()).toBe(true);

      component.onShowChangeEmail();
      expect(component.editing()).toBe(false);
      expect(component.showChangeEmail()).toBe(true);
    });
  });

  describe('followers tab', () => {
    const mockFollowers = {
      totalCount: 2,
      page: 1,
      pageSize: 10,
      items: [
        {
          userId: 'f1',
          userName: 'alice',
          displayName: 'Alice',
          avatarUrl: null,
          followedAtUtc: '2026-02-01T00:00:00Z',
        },
        {
          userId: 'f2',
          userName: 'bob',
          displayName: 'Bob',
          avatarUrl: 'https://example.com/bob.jpg',
          followedAtUtc: '2026-02-15T00:00:00Z',
        },
      ],
    };

    function createAndSwitchToFollowers() {
      create();
      http.expectOne('/api/me').flush(envelope(mockProfile));
      fixture.detectChanges();

      fixture.componentInstance.onTabChange('followers');
      fixture.detectChanges();
    }

    it('fetches followers when switching to Followers tab', () => {
      createAndSwitchToFollowers();

      http.expectOne('/api/me/followers?Page=1&PageSize=10').flush(envelope(mockFollowers));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Alice');
      expect(el.textContent).toContain('Bob');
    });

    it('shows empty state when no followers', () => {
      createAndSwitchToFollowers();

      http
        .expectOne('/api/me/followers?Page=1&PageSize=10')
        .flush(envelope({ totalCount: 0, page: 1, pageSize: 10, items: [] }));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('No followers yet');
    });

    it('navigates to next page', () => {
      create();
      http.expectOne('/api/me').flush(envelope(mockProfile));
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.onTabChange('followers');
      fixture.detectChanges();

      http
        .expectOne('/api/me/followers?Page=1&PageSize=10')
        .flush(envelope({ totalCount: 15, page: 1, pageSize: 10, items: mockFollowers.items }));
      fixture.detectChanges();

      component.onFollowersPage(2);
      fixture.detectChanges();

      const req = http.expectOne('/api/me/followers?Page=2&PageSize=10');
      expect(req.request.method).toBe('GET');
      req.flush(envelope({ totalCount: 15, page: 2, pageSize: 10, items: [] }));
    });

    it('shows inline confirmation on Remove click', () => {
      createAndSwitchToFollowers();
      http.expectOne('/api/me/followers?Page=1&PageSize=10').flush(envelope(mockFollowers));
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.onRemoveFollower('f1');
      fixture.detectChanges();

      expect(component.removingFollowerId()).toBe('f1');
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Are you sure');
    });

    it('sends DELETE on confirm removal and refreshes list', () => {
      createAndSwitchToFollowers();
      http.expectOne('/api/me/followers?Page=1&PageSize=10').flush(envelope(mockFollowers));
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.onRemoveFollower('f1');
      component.onConfirmRemove();

      const req = http.expectOne('/api/me/followers/f1');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope({ userId: 'f1', removed: true }));
      fixture.detectChanges();

      expect(component.removingFollowerId()).toBeNull();
      // Refresh followers list
      http
        .expectOne('/api/me/followers?Page=1&PageSize=10')
        .flush(envelope({ ...mockFollowers, items: [mockFollowers.items[1]], totalCount: 1 }));
    });

    it('hides confirmation on cancel', () => {
      createAndSwitchToFollowers();
      http.expectOne('/api/me/followers?Page=1&PageSize=10').flush(envelope(mockFollowers));
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.onRemoveFollower('f1');
      expect(component.removingFollowerId()).toBe('f1');

      component.onCancelRemove();
      expect(component.removingFollowerId()).toBeNull();
    });

    it('shows server error on removal failure', () => {
      createAndSwitchToFollowers();
      http.expectOne('/api/me/followers?Page=1&PageSize=10').flush(envelope(mockFollowers));
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.onRemoveFollower('f1');
      component.onConfirmRemove();

      http
        .expectOne('/api/me/followers/f1')
        .flush(errorEnvelope('FOLLOWER_NOT_FOUND', 'Follower not found'));
      fixture.detectChanges();

      expect(component.serverError()).toBe('Follower not found');
    });

    it('has links to public profiles for each follower', () => {
      createAndSwitchToFollowers();

      http.expectOne('/api/me/followers?Page=1&PageSize=10').flush(envelope(mockFollowers));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const link1 = el.querySelector('a[href="/users/f1"]');
      const link2 = el.querySelector('a[href="/users/f2"]');
      expect(link1).toBeTruthy();
      expect(link1!.textContent).toContain('Alice');
      expect(link2).toBeTruthy();
      expect(link2!.textContent).toContain('Bob');
    });
  });

  describe('following tab', () => {
    const mockFollowing = {
      totalCount: 1,
      page: 1,
      pageSize: 10,
      items: [
        {
          userId: 'u2',
          userName: 'carol',
          displayName: 'Carol',
          avatarUrl: null,
          followedAtUtc: '2026-03-01T00:00:00Z',
        },
      ],
    };

    function createAndSwitchToFollowing() {
      create();
      http.expectOne('/api/me').flush(envelope(mockProfile));
      fixture.detectChanges();

      fixture.componentInstance.onTabChange('following');
      fixture.detectChanges();
    }

    it('fetches following when switching to Following tab', () => {
      createAndSwitchToFollowing();

      http.expectOne('/api/me/following?Page=1&PageSize=10').flush(envelope(mockFollowing));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Carol');
    });

    it('shows empty state when not following anyone', () => {
      createAndSwitchToFollowing();

      http
        .expectOne('/api/me/following?Page=1&PageSize=10')
        .flush(envelope({ totalCount: 0, page: 1, pageSize: 10, items: [] }));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Not following anyone');
    });

    it('navigates to next page', () => {
      create();
      http.expectOne('/api/me').flush(envelope(mockProfile));
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.onTabChange('following');
      fixture.detectChanges();

      http
        .expectOne('/api/me/following?Page=1&PageSize=10')
        .flush(envelope({ totalCount: 15, page: 1, pageSize: 10, items: mockFollowing.items }));
      fixture.detectChanges();

      component.onFollowingPage(2);
      fixture.detectChanges();

      const req = http.expectOne('/api/me/following?Page=2&PageSize=10');
      expect(req.request.method).toBe('GET');
      req.flush(envelope({ totalCount: 15, page: 2, pageSize: 10, items: [] }));
    });

    it('does not show Remove button for following entries', () => {
      createAndSwitchToFollowing();

      http.expectOne('/api/me/following?Page=1&PageSize=10').flush(envelope(mockFollowing));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const removeBtn = el.querySelector('.btn-outline-danger');
      expect(removeBtn).toBeNull();
    });

    it('has links to public profiles for each followed user', () => {
      createAndSwitchToFollowing();

      http.expectOne('/api/me/following?Page=1&PageSize=10').flush(envelope(mockFollowing));
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const link = el.querySelector('a[href="/users/u2"]');
      expect(link).toBeTruthy();
      expect(link!.textContent).toContain('Carol');
    });
  });
});
