import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SubjectFollowService } from '../../../core/services/subject-follow.service';
import { SubjectTypeFollowService } from '../../../core/services/subject-type-follow.service';
import { UserFollowService } from '../../../core/services/user-follow.service';
import { NotificationService } from '../../../core/services/notification.service';
import { FollowSubjectSummaryDto2 } from '../../../api/models/follow-subject-summary-dto-2';
import { FollowSubjectTypeSummaryDto2 } from '../../../api/models/follow-subject-type-summary-dto-2';
import { FollowUserSummaryDto2 } from '../../../api/models/follow-user-summary-dto-2';
import { isApiError } from '../../../core/utils/api-error';

type Tab = 'subjects' | 'subject-types' | 'users';

@Component({
  selector: 'app-follows-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './follows-page.html',
})
export class FollowsPage implements OnInit {
  private readonly subjectFollowService = inject(SubjectFollowService);
  private readonly subjectTypeFollowService = inject(SubjectTypeFollowService);
  private readonly userFollowService = inject(UserFollowService);
  private readonly notification = inject(NotificationService);

  readonly activeTab = signal<Tab>('subjects');
  readonly subjects = signal<FollowSubjectSummaryDto2[]>([]);
  readonly subjectTypes = signal<FollowSubjectTypeSummaryDto2[]>([]);
  readonly users = signal<FollowUserSummaryDto2[]>([]);
  readonly loading = signal(true);
  readonly unfollowingId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadTab('subjects');
  }

  switchTab(tab: Tab): void {
    this.activeTab.set(tab);
    this.loadTab(tab);
  }

  onUnfollowSubject(subjectId: number): void {
    this.unfollowingId.set(`subject-${subjectId}`);
    this.subjectFollowService.unfollowSubject(subjectId).subscribe({
      next: () => {
        this.subjects.update((items) => items.filter((s) => s.subjectId !== subjectId));
        this.unfollowingId.set(null);
        this.notification.show('success', 'Unfollowed subject');
      },
      error: (err: unknown) => {
        this.unfollowingId.set(null);
        const message = isApiError(err) ? err.message : 'Failed to unfollow';
        this.notification.show('danger', message);
      },
    });
  }

  onUnfollowSubjectType(subjectTypeId: number): void {
    this.unfollowingId.set(`type-${subjectTypeId}`);
    this.subjectTypeFollowService.unfollowSubjectType(subjectTypeId).subscribe({
      next: () => {
        this.subjectTypes.update((items) =>
          items.filter((t) => t.subjectTypeId !== subjectTypeId),
        );
        this.unfollowingId.set(null);
        this.notification.show('success', 'Unfollowed subject type');
      },
      error: (err: unknown) => {
        this.unfollowingId.set(null);
        const message = isApiError(err) ? err.message : 'Failed to unfollow';
        this.notification.show('danger', message);
      },
    });
  }

  onUnfollowUser(userId: string): void {
    this.unfollowingId.set(`user-${userId}`);
    this.userFollowService.unfollowUser(userId).subscribe({
      next: () => {
        this.users.update((items) => items.filter((u) => u.userId !== userId));
        this.unfollowingId.set(null);
        this.notification.show('success', 'Unfollowed user');
      },
      error: (err: unknown) => {
        this.unfollowingId.set(null);
        const message = isApiError(err) ? err.message : 'Failed to unfollow';
        this.notification.show('danger', message);
      },
    });
  }

  private loadTab(tab: Tab): void {
    this.loading.set(true);

    switch (tab) {
      case 'subjects':
        this.subjectFollowService.getFollowedSubjects(1, 50).subscribe({
          next: (page) => {
            this.subjects.set(page?.items ?? []);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
        break;
      case 'subject-types':
        this.subjectTypeFollowService.getFollowedSubjectTypes(1, 50).subscribe({
          next: (page) => {
            this.subjectTypes.set(page?.items ?? []);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
        break;
      case 'users':
        this.userFollowService.getFollowing(1, 50).subscribe({
          next: (page) => {
            this.users.set(page?.items ?? []);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
        break;
    }
  }
}
