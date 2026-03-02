import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FeedService } from '../../core/services/feed.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ReviewSummaryDto } from '../../api/models/review-summary-dto';
import { FeedItemDto } from '../../api/models/feed-item-dto';

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
      overallRating =
        dto.ratings.reduce((sum, r) => sum + r.score, 0) / dto.ratings.length;
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
  return {
    id: dto.reviewId,
    subjectId: dto.subjectId,
    subjectName: dto.subjectName,
    authorId: dto.authorId,
    authorUserName: dto.authorUserName,
    authorDisplayName: dto.authorDisplayName,
    authorAvatarUrl: dto.authorAvatarUrl,
    title: dto.title,
    excerpt: dto.content,
    overallRating: null,
    createdAt: dto.createdAtUtc,
  };
}

interface ApiError {
  code: string;
  message: string;
  details: Record<string, string[]> | null;
}

function isApiError(err: unknown): err is ApiError {
  return err !== null && typeof err === 'object' && 'code' in err && 'message' in err;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly feedService = inject(FeedService);
  readonly authState = inject(AuthStateService);

  readonly latestItems = signal<FeedReviewItem[]>([]);
  readonly followingItems = signal<FeedReviewItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly activeTab = signal<'latest' | 'following'>('latest');
  readonly searchQuery = signal('');
  readonly activeItems = computed(() => {
    const items =
      this.activeTab() === 'following' ? this.followingItems() : this.latestItems();
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.subjectName?.toLowerCase().includes(query) ||
        item.authorUserName?.toLowerCase().includes(query) ||
        item.authorDisplayName?.toLowerCase().includes(query) ||
        item.title?.toLowerCase().includes(query) ||
        item.excerpt?.toLowerCase().includes(query),
    );
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
    this.feedService.getLatest().subscribe({
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
