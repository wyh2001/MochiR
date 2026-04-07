import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SubjectFollowService } from '../../../core/services/subject-follow.service';
import { SubjectTypeFollowService } from '../../../core/services/subject-type-follow.service';
import { UserFollowService } from '../../../core/services/user-follow.service';
import { NotificationService } from '../../../core/services/notification.service';
import { FollowSubjectSummaryDto } from '../../../api/models/follow-subject-summary-dto';
import { FollowSubjectTypeSummaryDto } from '../../../api/models/follow-subject-type-summary-dto';
import { FollowUserSummaryDto } from '../../../api/models/follow-user-summary-dto';
import { isApiError } from '../../../core/utils/api-error';

type Tab = 'subjects' | 'subject-types' | 'users';

@Component({
  selector: 'app-follows-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './follows-page.html',
})
export class FollowsPage implements OnInit {
  private readonly pageSize = 20;
  private readonly subjectFollowService = inject(SubjectFollowService);
  private readonly subjectTypeFollowService = inject(SubjectTypeFollowService);
  private readonly userFollowService = inject(UserFollowService);
  private readonly notification = inject(NotificationService);

  readonly activeTab = signal<Tab>('subjects');
  readonly subjects = signal<FollowSubjectSummaryDto[]>([]);
  readonly subjectTypes = signal<FollowSubjectTypeSummaryDto[]>([]);
  readonly users = signal<FollowUserSummaryDto[]>([]);
  readonly subjectsPage = signal(1);
  readonly subjectTypesPage = signal(1);
  readonly usersPage = signal(1);
  readonly subjectsTotal = signal(0);
  readonly subjectTypesTotal = signal(0);
  readonly usersTotal = signal(0);
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
        this.unfollowingId.set(null);
        this.refreshAfterRemoval('subjects');
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
        this.unfollowingId.set(null);
        this.refreshAfterRemoval('subject-types');
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
        this.unfollowingId.set(null);
        this.refreshAfterRemoval('users');
        this.notification.show('success', 'Unfollowed user');
      },
      error: (err: unknown) => {
        this.unfollowingId.set(null);
        const message = isApiError(err) ? err.message : 'Failed to unfollow';
        this.notification.show('danger', message);
      },
    });
  }

  onPreviousPage(): void {
    const page = this.currentPage();
    if (page > 1) {
      this.setPageFor(this.activeTab(), page - 1);
      this.loadTab(this.activeTab());
    }
  }

  onNextPage(): void {
    const page = this.currentPage();
    if (page < this.currentTotalPages()) {
      this.setPageFor(this.activeTab(), page + 1);
      this.loadTab(this.activeTab());
    }
  }

  currentPage(): number {
    switch (this.activeTab()) {
      case 'subjects':
        return this.subjectsPage();
      case 'subject-types':
        return this.subjectTypesPage();
      case 'users':
        return this.usersPage();
    }
  }

  currentTotalPages(): number {
    switch (this.activeTab()) {
      case 'subjects':
        return Math.max(1, Math.ceil(this.subjectsTotal() / this.pageSize));
      case 'subject-types':
        return Math.max(1, Math.ceil(this.subjectTypesTotal() / this.pageSize));
      case 'users':
        return Math.max(1, Math.ceil(this.usersTotal() / this.pageSize));
    }
  }

  private loadTab(tab: Tab): void {
    this.loading.set(true);

    switch (tab) {
      case 'subjects':
        this.subjectFollowService
          .getFollowedSubjects(this.subjectsPage(), this.pageSize)
          .subscribe({
            next: (page) => {
              this.subjects.set(page?.items ?? []);
              this.subjectsTotal.set(page?.totalCount ?? 0);
              this.loading.set(false);
            },
            error: () => this.loading.set(false),
          });
        break;
      case 'subject-types':
        this.subjectTypeFollowService
          .getFollowedSubjectTypes(this.subjectTypesPage(), this.pageSize)
          .subscribe({
            next: (page) => {
              this.subjectTypes.set(page?.items ?? []);
              this.subjectTypesTotal.set(page?.totalCount ?? 0);
              this.loading.set(false);
            },
            error: () => this.loading.set(false),
          });
        break;
      case 'users':
        this.userFollowService.getFollowing(this.usersPage(), this.pageSize).subscribe({
          next: (page) => {
            this.users.set(page?.items ?? []);
            this.usersTotal.set(page?.totalCount ?? 0);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
        break;
    }
  }

  private refreshAfterRemoval(tab: Tab): void {
    const nextTotal = Math.max(0, this.totalFor(tab) - 1);
    const nextTotalPages = Math.max(1, Math.ceil(nextTotal / this.pageSize));
    this.setPageFor(tab, Math.min(this.pageFor(tab), nextTotalPages));
    this.loadTab(tab);
  }

  private pageFor(tab: Tab): number {
    switch (tab) {
      case 'subjects':
        return this.subjectsPage();
      case 'subject-types':
        return this.subjectTypesPage();
      case 'users':
        return this.usersPage();
    }
  }

  private totalFor(tab: Tab): number {
    switch (tab) {
      case 'subjects':
        return this.subjectsTotal();
      case 'subject-types':
        return this.subjectTypesTotal();
      case 'users':
        return this.usersTotal();
    }
  }

  private setPageFor(tab: Tab, page: number): void {
    switch (tab) {
      case 'subjects':
        this.subjectsPage.set(page);
        break;
      case 'subject-types':
        this.subjectTypesPage.set(page);
        break;
      case 'users':
        this.usersPage.set(page);
        break;
    }
  }
}
