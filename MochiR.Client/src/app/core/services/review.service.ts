import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReviewSummaryDto } from '../../api/models/review-summary-dto';
import { ReviewDetailDto } from '../../api/models/review-detail-dto';
import { CreateReviewDto } from '../../api/models/create-review-dto';
import { UpdateReviewDto } from '../../api/models/update-review-dto';
import { ReviewDeleteResultDto } from '../../api/models/review-delete-result-dto';
import { ReviewLikeResultDto } from '../../api/models/review-like-result-dto';
import { LatestReviewsPageDto } from '../../api/models/latest-reviews-page-dto';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

  getLatest(params?: {
    page?: number;
    pageSize?: number;
    after?: string;
    afterId?: number;
  }): Observable<LatestReviewsPageDto> {
    const queryParams: Record<string, string> = {};
    if (params?.page != null) queryParams['Page'] = params.page.toString();
    if (params?.pageSize != null) queryParams['PageSize'] = params.pageSize.toString();
    if (params?.after != null) queryParams['After'] = params.after;
    if (params?.afterId != null) queryParams['AfterId'] = params.afterId.toString();
    return this.http.get<LatestReviewsPageDto>('/api/reviews/latest', { params: queryParams });
  }

  getAll(filters?: { subjectId?: number; userId?: string }): Observable<ReviewSummaryDto[]> {
    const params: Record<string, string> = {};
    if (filters?.subjectId != null) params['subjectId'] = filters.subjectId.toString();
    if (filters?.userId != null) params['userId'] = filters.userId;
    return this.http.get<ReviewSummaryDto[]>('/api/reviews', { params });
  }

  getById(id: number): Observable<ReviewDetailDto> {
    return this.http.get<ReviewDetailDto>(`/api/reviews/${id}`);
  }

  create(dto: CreateReviewDto, context?: HttpContext): Observable<ReviewSummaryDto> {
    return this.http.post<ReviewSummaryDto>('/api/reviews', dto, { context });
  }

  update(id: number, dto: UpdateReviewDto, context?: HttpContext): Observable<ReviewSummaryDto> {
    return this.http.put<ReviewSummaryDto>(`/api/reviews/${id}`, dto, { context });
  }

  delete(id: number): Observable<ReviewDeleteResultDto> {
    return this.http.delete<ReviewDeleteResultDto>(`/api/reviews/${id}`);
  }

  like(id: number): Observable<ReviewLikeResultDto> {
    return this.http.post<ReviewLikeResultDto>(`/api/reviews/${id}/like`, {});
  }

  unlike(id: number): Observable<ReviewLikeResultDto> {
    return this.http.delete<ReviewLikeResultDto>(`/api/reviews/${id}/like`);
  }
}
