import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserDirectoryResponseDto } from '../../api/models/user-directory-response-dto';
import { FollowUserRelationshipDto } from '../../api/models/follow-user-relationship-dto';
import { FollowUserPageDto } from '../../api/models/follow-user-page-dto';

@Injectable({ providedIn: 'root' })
export class UserFollowService {
  private readonly http = inject(HttpClient);

  getUserProfile(userId: string): Observable<UserDirectoryResponseDto> {
    return this.http.get<UserDirectoryResponseDto>(`/api/users/${userId}`);
  }

  followUser(userId: string, context?: HttpContext): Observable<FollowUserRelationshipDto> {
    return this.http.post<FollowUserRelationshipDto>(
      `/api/follows/users/${userId}`,
      {},
      {
        context,
      },
    );
  }

  unfollowUser(userId: string, context?: HttpContext): Observable<FollowUserRelationshipDto> {
    return this.http.delete<FollowUserRelationshipDto>(`/api/follows/users/${userId}`, {
      context,
    });
  }

  getFollowing(page?: number, pageSize?: number): Observable<FollowUserPageDto> {
    const params: Record<string, string> = {};
    if (page != null) params['Page'] = page.toString();
    if (pageSize != null) params['PageSize'] = pageSize.toString();
    return this.http.get<FollowUserPageDto>('/api/follows/users', { params });
  }

  getRelationships(userIds: string[]): Observable<FollowUserRelationshipDto[]> {
    const params: Record<string, string | string[]> = {};
    if (userIds.length > 0) {
      params['userIds'] = userIds;
    }

    return this.http.get<FollowUserRelationshipDto[]>('/api/follows/users/relationships', {
      params,
    });
  }
}
