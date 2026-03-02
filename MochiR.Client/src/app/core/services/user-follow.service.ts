import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserDirectoryResponseDto } from '../../api/models/user-directory-response-dto';
import { FollowUserSummaryDto } from '../../api/models/follow-user-summary-dto';
import { FollowDeletionResultDto } from '../../api/models/follow-deletion-result-dto';
import { FollowUserPageDto } from '../../api/models/follow-user-page-dto';

@Injectable({ providedIn: 'root' })
export class UserFollowService {
  private readonly http = inject(HttpClient);

  getUserProfile(userId: string): Observable<UserDirectoryResponseDto> {
    return this.http.get<UserDirectoryResponseDto>(`/api/users/${userId}`);
  }

  followUser(userId: string): Observable<FollowUserSummaryDto> {
    return this.http.post<FollowUserSummaryDto>(`/api/follows/users/${userId}`, {});
  }

  unfollowUser(userId: string): Observable<FollowDeletionResultDto> {
    return this.http.delete<FollowDeletionResultDto>(`/api/follows/users/${userId}`);
  }

  getFollowing(page?: number, pageSize?: number): Observable<FollowUserPageDto> {
    const params: Record<string, string> = {};
    if (page != null) params['Page'] = page.toString();
    if (pageSize != null) params['PageSize'] = pageSize.toString();
    return this.http.get<FollowUserPageDto>('/api/follows/users', { params });
  }
}
