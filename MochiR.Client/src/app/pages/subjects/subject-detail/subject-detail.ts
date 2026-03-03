import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { SubjectService } from '../../../core/services/subject.service';
import { SubjectFollowService } from '../../../core/services/subject-follow.service';
import { RatingService } from '../../../core/services/rating.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { SubjectDetailDto } from '../../../api/models/subject-detail-dto';
import { SubjectAggregateDto } from '../../../api/models/subject-aggregate-dto';
import { isApiError } from '../../../core/utils/api-error';

@Component({
  selector: 'app-subject-detail',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './subject-detail.html',
})
export class SubjectDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly subjectService = inject(SubjectService);
  private readonly subjectFollowService = inject(SubjectFollowService);
  private readonly ratingService = inject(RatingService);
  private readonly notification = inject(NotificationService);
  private readonly authState = inject(AuthStateService);

  readonly isAdmin = this.authState.isAdmin;
  readonly isAuthenticated = this.authState.isAuthenticated;
  readonly subject = signal<SubjectDetailDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly confirmingDelete = signal(false);
  readonly isFollowing = signal(false);
  readonly followLoading = signal(true);
  readonly followActionLoading = signal(false);
  readonly aggregate = signal<SubjectAggregateDto>(null);
  readonly aggregateLoading = signal(true);

  private subjectId = 0;

  ngOnInit(): void {
    this.subjectId = Number(this.route.snapshot.params['id']);
    this.subjectService.getById(this.subjectId).subscribe({
      next: (data) => {
        this.subject.set(data);
        this.loading.set(false);
        this.loadAggregate();
        if (this.isAuthenticated()) {
          this.loadFollowState();
        } else {
          this.followLoading.set(false);
        }
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.followLoading.set(false);
        this.aggregateLoading.set(false);
        if (isApiError(err)) {
          this.error.set(err.message);
        }
      },
    });
  }

  onDelete(): void {
    this.confirmingDelete.set(true);
  }

  onCancelDelete(): void {
    this.confirmingDelete.set(false);
  }

  onConfirmDelete(): void {
    this.subjectService.delete(this.subjectId).subscribe({
      next: () => {
        this.notification.show('success', 'Subject deleted successfully.');
        this.router.navigateByUrl('/subjects');
      },
      error: (err: unknown) => {
        this.confirmingDelete.set(false);
        if (isApiError(err)) {
          this.error.set(err.message);
        }
      },
    });
  }

  onFollowToggle(): void {
    if (this.followActionLoading()) return;

    this.followActionLoading.set(true);

    if (this.isFollowing()) {
      this.subjectFollowService.unfollowSubject(this.subjectId).subscribe({
        next: () => {
          this.isFollowing.set(false);
          this.followActionLoading.set(false);
          this.notification.show('success', 'Unfollowed subject');
        },
        error: (err: unknown) => {
          this.followActionLoading.set(false);
          const message = isApiError(err) ? err.message : 'Failed to unfollow subject';
          this.notification.show('danger', message);
        },
      });
    } else {
      this.subjectFollowService.followSubject(this.subjectId).subscribe({
        next: () => {
          this.isFollowing.set(true);
          this.followActionLoading.set(false);
          this.notification.show('success', 'Followed subject');
        },
        error: (err: unknown) => {
          this.followActionLoading.set(false);
          const message = isApiError(err) ? err.message : 'Failed to follow subject';
          this.notification.show('danger', message);
        },
      });
    }
  }

  private loadFollowState(): void {
    this.followLoading.set(true);
    this.subjectFollowService.getFollowedSubjects(1, 50).subscribe({
      next: (page) => {
        if (page) {
          const followedIds = new Set(page.items.map((item) => item.subjectId));
          this.isFollowing.set(followedIds.has(this.subjectId));
        }
        this.followLoading.set(false);
      },
      error: () => {
        this.followLoading.set(false);
      },
    });
  }

  private loadAggregate(): void {
    this.aggregateLoading.set(true);
    this.ratingService.getAggregate(this.subjectId).subscribe({
      next: (data) => {
        this.aggregate.set(data);
        this.aggregateLoading.set(false);
      },
      error: () => {
        this.aggregateLoading.set(false);
      },
    });
  }
}
