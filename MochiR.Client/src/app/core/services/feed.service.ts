import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FeedPageDto } from '../../api/models/feed-page-dto';

@Injectable({ providedIn: 'root' })
export class FeedService {
  private readonly http = inject(HttpClient);

  getFollowing(params?: {
    page?: number;
    pageSize?: number;
    after?: string;
    afterId?: number;
  }): Observable<FeedPageDto> {
    const queryParams: Record<string, string> = {};
    if (params?.page != null) queryParams['Page'] = params.page.toString();
    if (params?.pageSize != null) queryParams['PageSize'] = params.pageSize.toString();
    if (params?.after != null) queryParams['After'] = params.after;
    if (params?.afterId != null) queryParams['AfterId'] = params.afterId.toString();
    return this.http.get<FeedPageDto>('/api/feed', { params: queryParams });
  }
}
