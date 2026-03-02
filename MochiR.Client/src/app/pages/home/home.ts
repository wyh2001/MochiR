import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReviewService } from '../../core/services/review.service';
import { FeedService } from '../../core/services/feed.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ReviewSummaryDto } from '../../api/models/review-summary-dto';
import { FeedItemDto } from '../../api/models/feed-item-dto';
import { isApiError } from '../../core/utils/api-error';

export interface FeedReviewItem {
  id: number;
  subjectId: number;
  subjectName: string | null;
  authorId: string | null;
  authorUserName: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  title: string | null;
  excerpt: string | null;
  overallRating: number | null;
  createdAt: string;
}

export function mapLatestItem(dto: ReviewSummaryDto): FeedReviewItem {
  let overallRating: number | null = null;
  if (dto.ratings && dto.ratings.length > 0) {
    const overall = dto.ratings.find((r) => r.key === 'overall');
    if (overall) {
      overallRating = overall.score;
    } else {
      overallRating = dto.ratings.reduce((sum, r) => sum + r.score, 0) / dto.ratings.length;
    }
  }
  return {
    id: dto.id,
    subjectId: dto.subjectId,
    subjectName: dto.subjectName,
    authorId: dto.userId,
    authorUserName: dto.authorUserName,
    authorDisplayName: dto.authorDisplayName,
    authorAvatarUrl: dto.authorAvatarUrl,
    title: dto.title,
    excerpt: dto.excerpt,
    overallRating,
    createdAt: dto.createdAt,
  };
}

export function mapFeedItem(dto: FeedItemDto): FeedReviewItem {
  const maxExcerpt = 200;
  let excerpt = dto.content;
  if (excerpt && excerpt.length > maxExcerpt) {
    excerpt = excerpt.substring(0, maxExcerpt);
  }
  return {
    id: dto.reviewId,
    subjectId: dto.subjectId,
    subjectName: dto.subjectName,
    authorId: dto.authorId,
    authorUserName: dto.authorUserName,
    authorDisplayName: dto.authorDisplayName,
    authorAvatarUrl: dto.authorAvatarUrl,
    title: dto.title,
    excerpt,
    overallRating: null,
    createdAt: dto.createdAtUtc,
  };
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly reviewService = inject(ReviewService);
  private readonly feedService = inject(FeedService);
  readonly authState = inject(AuthStateService);

  readonly latestItems = signal<FeedReviewItem[]>([]);
  readonly followingItems = signal<FeedReviewItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly activeTab = signal<'latest' | 'following'>('latest');
  readonly activeItems = computed(() => {
    return this.activeTab() === 'following' ? this.followingItems() : this.latestItems();
  });

  ngOnInit(): void {
    this.loadLatest();
    if (this.authState.isAuthenticated()) {
      this.loadFollowing();
    }
  }

  loadLatest(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reviewService.getLatest().subscribe({
      next: (page) => {
        this.latestItems.set(page.items.map(mapLatestItem));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(isApiError(err) ? err.message : 'An unexpected error occurred');
        this.loading.set(false);
      },
    });
  }

  loadFollowing(): void {
    this.feedService.getFollowing().subscribe({
      next: (page) => {
        this.followingItems.set(page.items.map(mapFeedItem));
      },
      error: () => {
        // Following feed errors are non-blocking
      },
    });
  }

  retry(): void {
    this.loadLatest();
    if (this.authState.isAuthenticated()) {
      this.loadFollowing();
    }
  }
}
