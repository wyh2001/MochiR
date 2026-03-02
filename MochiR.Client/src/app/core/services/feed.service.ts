import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LatestReviewsPageDto } from '../../api/models/latest-reviews-page-dto';
import { FeedPageDto } from '../../api/models/feed-page-dto';

@Injectable({ providedIn: 'root' })
export class FeedService {
  private readonly http = inject(HttpClient);

  getLatest(): Observable<LatestReviewsPageDto> {
    return this.http.get<LatestReviewsPageDto>('/api/reviews/latest');
  }

  getFollowing(): Observable<FeedPageDto> {
    return this.http.get<FeedPageDto>('/api/feed');
  }
}
