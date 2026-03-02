import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserFollowService {
  private readonly http = inject(HttpClient);

  getUserProfile(userId: string): Observable<unknown> {
    return this.http.get(`/api/users/${userId}`);
  }

  followUser(userId: string): Observable<unknown> {
    return this.http.post(`/api/follows/users/${userId}`, {});
  }

  unfollowUser(userId: string): Observable<unknown> {
    return this.http.delete(`/api/follows/users/${userId}`);
  }

  getFollowing(page: number, pageSize: number): Observable<unknown> {
    return this.http.get(`/api/follows/users`, {
      params: { Page: page, PageSize: pageSize },
    });
  }
}
