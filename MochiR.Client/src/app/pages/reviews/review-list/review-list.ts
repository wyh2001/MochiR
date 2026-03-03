import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReviewService } from '../../../core/services/review.service';
import { ReviewSummaryDto } from '../../../api/models/review-summary-dto';
import { LatestReviewsCursorDto } from '../../../api/models/latest-reviews-cursor-dto';
import { ReviewCard } from '../review-card/review-card';

@Component({
  selector: 'app-review-list',
  standalone: true,
  imports: [ReviewCard],
  templateUrl: './review-list.html',
})
export class ReviewList implements OnInit {
  private readonly reviewService = inject(ReviewService);
  private readonly route = inject(ActivatedRoute);

  readonly reviews = signal<ReviewSummaryDto[]>([]);
  readonly loading = signal(false);
  readonly hasMore = signal(false);
  readonly nextCursor = signal<LatestReviewsCursorDto | null>(null);
  readonly totalCount = signal(0);
  readonly filterSubjectId = signal<number | null>(null);
  readonly filterUserId = signal<string | null>(null);
  readonly isFiltered = signal(false);

  ngOnInit(): void {
    const subjectId = this.route.snapshot.queryParams['subjectId'];
    const userId = this.route.snapshot.queryParams['userId'];

    if (subjectId || userId) {
      this.isFiltered.set(true);
      if (subjectId) this.filterSubjectId.set(+subjectId);
      if (userId) this.filterUserId.set(userId);
      this.loadFiltered();
    } else {
      this.loadMore();
    }
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    this.loading.set(true);
    this.reviewService
      .getLatest({
        after: cursor?.createdAtUtc,
        afterId: cursor?.reviewId,
      })
      .subscribe({
        next: (page) => {
          this.reviews.update((prev) => [...prev, ...page.items]);
          this.hasMore.set(page.hasMore);
          this.nextCursor.set(page.nextCursor ?? null);
          this.totalCount.set(page.totalCount);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  loadFiltered(): void {
    this.loading.set(true);
    this.reviewService
      .getAll({
        subjectId: this.filterSubjectId() ?? undefined,
        userId: this.filterUserId() ?? undefined,
      })
      .subscribe({
        next: (data) => {
          this.reviews.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }
}
