import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SubjectTypeService } from '../../../core/services/subject-type.service';
import { SubjectTypeFollowService } from '../../../core/services/subject-type-follow.service';
import { SubjectTypeSummaryDto } from '../../../api/models/subject-type-summary-dto';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { isApiError } from '../../../core/utils/api-error';

@Component({
  selector: 'app-subject-type-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './subject-type-list.html',
})
export class SubjectTypeList implements OnInit {
  private readonly subjectTypeService = inject(SubjectTypeService);
  private readonly subjectTypeFollowService = inject(SubjectTypeFollowService);
  private readonly notification = inject(NotificationService);
  private readonly authState = inject(AuthStateService);

  readonly isAdmin = this.authState.isAdmin;
  readonly isAuthenticated = this.authState.isAuthenticated;
  readonly subjectTypes = signal<SubjectTypeSummaryDto[]>([]);
  readonly loading = signal(true);
  readonly deletingId = signal<number | null>(null);
  readonly followedTypeIds = signal<Set<number>>(new Set());
  readonly followLoadingIds = signal<Set<number>>(new Set());
  readonly followStateLoading = signal(true);

  ngOnInit(): void {
    this.loadList();
    if (this.isAuthenticated()) {
      this.loadFollowState();
    } else {
      this.followStateLoading.set(false);
    }
  }

  confirmDelete(id: number): void {
    this.subjectTypeService.delete(id).subscribe({
      next: () => {
        this.notification.show('success', 'Subject type deleted successfully.');
        this.deletingId.set(null);
        this.loadList();
      },
      error: (err: unknown) => {
        if (isApiError(err)) {
          this.notification.show('danger', err.message);
        }
        this.deletingId.set(null);
      },
    });
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  onFollowToggle(typeId: number): void {
    if (this.followLoadingIds().has(typeId)) return;

    this.followLoadingIds.update((ids) => new Set([...ids, typeId]));

    if (this.followedTypeIds().has(typeId)) {
      this.subjectTypeFollowService.unfollowSubjectType(typeId).subscribe({
        next: () => {
          this.followedTypeIds.update((ids) => {
            const next = new Set(ids);
            next.delete(typeId);
            return next;
          });
          this.followLoadingIds.update((ids) => {
            const next = new Set(ids);
            next.delete(typeId);
            return next;
          });
          this.notification.show('success', 'Unfollowed subject type');
        },
        error: (err: unknown) => {
          this.followLoadingIds.update((ids) => {
            const next = new Set(ids);
            next.delete(typeId);
            return next;
          });
          const message = isApiError(err) ? err.message : 'Failed to unfollow';
          this.notification.show('danger', message);
        },
      });
    } else {
      this.subjectTypeFollowService.followSubjectType(typeId).subscribe({
        next: () => {
          this.followedTypeIds.update((ids) => new Set([...ids, typeId]));
          this.followLoadingIds.update((ids) => {
            const next = new Set(ids);
            next.delete(typeId);
            return next;
          });
          this.notification.show('success', 'Followed subject type');
        },
        error: (err: unknown) => {
          this.followLoadingIds.update((ids) => {
            const next = new Set(ids);
            next.delete(typeId);
            return next;
          });
          const message = isApiError(err) ? err.message : 'Failed to follow';
          this.notification.show('danger', message);
        },
      });
    }
  }

  private loadList(): void {
    this.loading.set(true);
    this.subjectTypeService.getAll().subscribe({
      next: (data) => {
        this.subjectTypes.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private loadFollowState(): void {
    this.followStateLoading.set(true);
    this.subjectTypeFollowService.getFollowedSubjectTypes(1, 50).subscribe({
      next: (page) => {
        if (page) {
          this.followedTypeIds.set(new Set(page.items.map((item) => item.subjectTypeId)));
        }
        this.followStateLoading.set(false);
      },
      error: () => {
        this.followStateLoading.set(false);
      },
    });
  }
}
