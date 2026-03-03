import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { UserFollowService } from '../../../core/services/user-follow.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { withSkipErrorToast } from '../../../core/interceptors/error.interceptor';
import { DirectoryUserDetailDto } from '../../../api/models/directory-user-detail-dto';
import { isApiError } from '../../../core/utils/api-error';

@Component({
  selector: 'app-user-profile-page',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './user-profile.html',
})
export class UserProfilePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userFollowService = inject(UserFollowService);
  private readonly authState = inject(AuthStateService);
  private readonly notification = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = signal<DirectoryUserDetailDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly isFollowing = signal(false);
  readonly followLoading = signal(true);
  readonly actionLoading = signal(false);

  private userId = '';

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.userId = params['id'];

      if (this.userId === this.authState.user()?.id) {
        this.router.navigateByUrl('/profile');
        return;
      }

      this.loadProfile();
    });
  }

  onFollowToggle(): void {
    if (this.actionLoading()) return;

    this.actionLoading.set(true);

    if (this.isFollowing()) {
      this.userFollowService.unfollowUser(this.userId, withSkipErrorToast()).subscribe({
        next: () => {
          this.isFollowing.set(false);
          this.actionLoading.set(false);
          this.notification.show('success', 'Unfollowed successfully');
        },
        error: (err) => {
          this.actionLoading.set(false);
          const message = isApiError(err) ? err.message : 'Failed to unfollow user';
          this.notification.show('danger', message);
        },
      });
    } else {
      this.userFollowService.followUser(this.userId, withSkipErrorToast()).subscribe({
        next: () => {
          this.isFollowing.set(true);
          this.actionLoading.set(false);
          this.notification.show('success', 'Followed successfully');
        },
        error: (err) => {
          this.actionLoading.set(false);
          const message = isApiError(err) ? err.message : 'Failed to follow user';
          this.notification.show('danger', message);
        },
      });
    }
  }

  private loadProfile(): void {
    this.loading.set(true);
    this.error.set(null);

    this.userFollowService.getUserProfile(this.userId).subscribe({
      next: (response) => {
        this.profile.set(response.public);
        this.loading.set(false);
        this.loadFollowState();
      },
      error: (err) => {
        this.loading.set(false);
        if (isApiError(err)) {
          this.error.set(err.message);
        } else {
          this.error.set('An error occurred while loading the profile');
        }
      },
    });
  }

  private loadFollowState(): void {
    this.followLoading.set(true);

    this.userFollowService.getFollowing(1, 50).subscribe({
      next: (page) => {
        if (page) {
          const followedIds = new Set(page.items.map((item) => item.userId));
          this.isFollowing.set(followedIds.has(this.userId));
        }
        this.followLoading.set(false);
      },
      error: () => {
        this.followLoading.set(false);
      },
    });
  }

  get displayName(): string {
    const p = this.profile();
    return p?.displayName ?? p?.userName ?? '';
  }

  get avatarInitial(): string {
    return this.displayName.charAt(0).toUpperCase();
  }
}
