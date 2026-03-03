import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { withSkipErrorToast } from '../../../core/interceptors/error.interceptor';
import { SelfProfileDto } from '../../../api/models/self-profile-dto';
import { SelfFollowSummaryDto } from '../../../api/models/self-follow-summary-dto';
import { isApiError } from '../../../core/utils/api-error';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, UpperCasePipe],
  templateUrl: './profile-page.html',
})
export class ProfilePage implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly authState = inject(AuthStateService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  // Profile state
  readonly profile = signal<SelfProfileDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // Tab state
  readonly activeTab = signal<'info' | 'followers' | 'following'>('info');

  // Edit profile state
  readonly editing = signal(false);
  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly editForm = this.fb.nonNullable.group({
    displayName: [''],
    avatarUrl: [''],
  });

  // Change password state
  readonly showChangePassword = signal(false);
  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', Validators.required],
  });

  // Change email state
  readonly showChangeEmail = signal(false);
  readonly emailForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newEmail: ['', [Validators.required, Validators.email]],
  });

  // Followers state
  readonly followers = signal<SelfFollowSummaryDto[]>([]);
  readonly followersTotal = signal(0);
  readonly followersPage = signal(1);
  readonly followersLoading = signal(false);
  readonly removingFollowerId = signal<string | null>(null);

  // Following state
  readonly following = signal<SelfFollowSummaryDto[]>([]);
  readonly followingTotal = signal(0);
  readonly followingPage = signal(1);
  readonly followingLoading = signal(false);

  readonly pageSize = 10;

  ngOnInit(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.loading.set(true);
    this.error.set(null);
    this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        if (isApiError(err)) {
          this.error.set(err.message);
        } else {
          this.error.set('Failed to load profile.');
        }
      },
    });
  }

  onTabChange(tab: 'info' | 'followers' | 'following'): void {
    this.activeTab.set(tab);
    if (tab === 'followers' && this.followers().length === 0) {
      this.loadFollowers();
    } else if (tab === 'following' && this.following().length === 0) {
      this.loadFollowing();
    }
  }

  // --- Edit Profile ---

  onEdit(): void {
    this.closeAllForms();
    const p = this.profile();
    if (p) {
      this.editForm.patchValue({
        displayName: p.displayName ?? '',
        avatarUrl: p.avatarUrl ?? '',
      });
    }
    this.editing.set(true);
  }

  onCancelEdit(): void {
    this.editing.set(false);
    this.serverError.set(null);
  }

  onSubmitEdit(): void {
    this.serverError.set(null);
    this.submitting.set(true);

    const raw = this.editForm.getRawValue();
    const dto: Record<string, unknown> = {};
    dto['displayName'] = raw.displayName || null;
    dto['avatarUrl'] = raw.avatarUrl || null;

    this.profileService.updateProfile(dto, withSkipErrorToast()).subscribe({
      next: (updated) => {
        this.submitting.set(false);
        this.profile.set(updated);
        this.editing.set(false);
        this.notifications.show('success', 'Profile updated successfully.');

        // Sync AuthStateService if display name changed
        const currentUser = this.authState.user();
        if (currentUser) {
          this.authState.setUser({
            ...currentUser,
            displayName: updated.displayName ?? currentUser.userName,
          });
        }
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        if (isApiError(err)) {
          this.serverError.set(err.message);
        } else {
          this.serverError.set('Something went wrong. Please try again.');
        }
      },
    });
  }

  // --- Change Password ---

  onShowChangePassword(): void {
    this.closeAllForms();
    this.passwordForm.reset();
    this.showChangePassword.set(true);
  }

  onCancelPassword(): void {
    this.showChangePassword.set(false);
    this.serverError.set(null);
  }

  onSubmitPassword(): void {
    if (this.passwordForm.invalid) return;

    this.serverError.set(null);
    this.submitting.set(true);

    const raw = this.passwordForm.getRawValue();
    this.profileService.changePassword(raw, withSkipErrorToast()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showChangePassword.set(false);
        this.passwordForm.reset();
        this.notifications.show('success', 'Password changed successfully.');
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        if (isApiError(err)) {
          this.serverError.set(err.message);
        } else {
          this.serverError.set('Something went wrong. Please try again.');
        }
      },
    });
  }

  // --- Change Email ---

  onShowChangeEmail(): void {
    this.closeAllForms();
    this.emailForm.reset();
    this.showChangeEmail.set(true);
  }

  onCancelEmail(): void {
    this.showChangeEmail.set(false);
    this.serverError.set(null);
  }

  onSubmitEmail(): void {
    if (this.emailForm.invalid) return;

    this.serverError.set(null);
    this.submitting.set(true);

    const raw = this.emailForm.getRawValue();
    this.profileService
      .requestEmailChange(
        { currentPassword: raw.currentPassword, email: raw.newEmail },
        withSkipErrorToast(),
      )
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showChangeEmail.set(false);
          this.emailForm.reset();
          this.notifications.show('success', 'Confirmation email sent. Please check your inbox.');
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          if (isApiError(err)) {
            this.serverError.set(err.message);
          } else {
            this.serverError.set('Something went wrong. Please try again.');
          }
        },
      });
  }

  // --- Followers ---

  loadFollowers(): void {
    this.followersLoading.set(true);
    this.profileService.getFollowers(this.followersPage(), this.pageSize).subscribe({
      next: (page) => {
        this.followersLoading.set(false);
        if (page) {
          this.followers.set(page.items);
          this.followersTotal.set(page.totalCount);
        }
      },
      error: () => {
        this.followersLoading.set(false);
      },
    });
  }

  onFollowersPage(page: number): void {
    this.followersPage.set(page);
    this.loadFollowers();
  }

  onRemoveFollower(userId: string): void {
    this.removingFollowerId.set(userId);
  }

  onConfirmRemove(): void {
    const userId = this.removingFollowerId();
    if (!userId) return;

    this.serverError.set(null);
    this.profileService.removeFollower(userId, withSkipErrorToast()).subscribe({
      next: () => {
        this.removingFollowerId.set(null);
        this.notifications.show('success', 'Follower removed.');
        this.loadFollowers();
      },
      error: (err: unknown) => {
        this.removingFollowerId.set(null);
        if (isApiError(err)) {
          this.serverError.set(err.message);
        } else {
          this.serverError.set('Something went wrong. Please try again.');
        }
      },
    });
  }

  onCancelRemove(): void {
    this.removingFollowerId.set(null);
  }

  // --- Following ---

  loadFollowing(): void {
    this.followingLoading.set(true);
    this.profileService.getFollowing(this.followingPage(), this.pageSize).subscribe({
      next: (page) => {
        this.followingLoading.set(false);
        if (page) {
          this.following.set(page.items);
          this.followingTotal.set(page.totalCount);
        }
      },
      error: () => {
        this.followingLoading.set(false);
      },
    });
  }

  onFollowingPage(page: number): void {
    this.followingPage.set(page);
    this.loadFollowing();
  }

  get followersTotalPages(): number {
    return Math.ceil(this.followersTotal() / this.pageSize);
  }

  get followingTotalPages(): number {
    return Math.ceil(this.followingTotal() / this.pageSize);
  }

  private closeAllForms(): void {
    this.editing.set(false);
    this.showChangePassword.set(false);
    this.showChangeEmail.set(false);
    this.serverError.set(null);
  }
}
