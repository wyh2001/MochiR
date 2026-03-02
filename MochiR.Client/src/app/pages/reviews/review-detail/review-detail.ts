import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ReviewService } from '../../../core/services/review.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ReviewDetailDto } from '../../../api/models/review-detail-dto';
import { isApiError } from '../../../core/utils/api-error';

@Component({
  selector: 'app-review-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './review-detail.html',
})
export class ReviewDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reviewService = inject(ReviewService);
  readonly authState = inject(AuthStateService);
  private readonly notification = inject(NotificationService);

  readonly review = signal<ReviewDetailDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly confirmingDelete = signal(false);

  private reviewId = 0;

  readonly isAuthor = computed(() => {
    const review = this.review();
    const user = this.authState.user();
    return review != null && user != null && review.userId === user.id;
  });

  ngOnInit(): void {
    this.reviewId = Number(this.route.snapshot.params['id']);
    this.reviewService.getById(this.reviewId).subscribe({
      next: (data) => {
        this.review.set(data);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
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
    this.reviewService.delete(this.reviewId).subscribe({
      next: () => {
        this.notification.show('success', 'Review deleted successfully.');
        this.router.navigateByUrl('/reviews');
      },
      error: (err: unknown) => {
        this.confirmingDelete.set(false);
        if (isApiError(err)) {
          this.error.set(err.message);
        }
      },
    });
  }

  onToggleLike(): void {
    const review = this.review();
    if (!review) return;
    const action$ = review.isLikedByCurrentUser
      ? this.reviewService.unlike(review.id)
      : this.reviewService.like(review.id);
    action$.subscribe({
      next: (result) => {
        if (result) {
          this.review.update((r) =>
            r
              ? {
                  ...r,
                  likeCount: result.likeCount,
                  isLikedByCurrentUser: result.isLikedByCurrentUser,
                }
              : r,
          );
        }
      },
      error: () => {
        // Silently ignore — state remains unchanged
      },
    });
  }
}
