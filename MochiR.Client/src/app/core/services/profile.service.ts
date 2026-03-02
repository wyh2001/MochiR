import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SelfProfileDto } from '../../api/models/self-profile-dto';
import { SelfProfilePatchRequestDto } from '../../api/models/self-profile-patch-request-dto';
import { SelfPasswordChangeRequestDto } from '../../api/models/self-password-change-request-dto';
import { SelfEmailTokenRequestDto } from '../../api/models/self-email-token-request-dto';
import { SelfEmailConfirmRequestDto } from '../../api/models/self-email-confirm-request-dto';
import { SelfEmailTokenDispatchResponseDto } from '../../api/models/self-email-token-dispatch-response-dto';
import { SelfFollowPageDto } from '../../api/models/self-follow-page-dto';
import { SelfFollowerRemovalResultDto } from '../../api/models/self-follower-removal-result-dto';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);

  getProfile(): Observable<SelfProfileDto> {
    return this.http.get<SelfProfileDto>('/api/me');
  }

  updateProfile(dto: SelfProfilePatchRequestDto): Observable<SelfProfileDto> {
    return this.http.patch<SelfProfileDto>('/api/me', dto);
  }

  changePassword(dto: SelfPasswordChangeRequestDto): Observable<SelfProfileDto> {
    return this.http.post<SelfProfileDto>('/api/me/password/change', dto);
  }

  requestEmailChange(dto: SelfEmailTokenRequestDto): Observable<SelfEmailTokenDispatchResponseDto> {
    return this.http.post<SelfEmailTokenDispatchResponseDto>('/api/me/email/token', dto);
  }

  confirmEmailChange(dto: SelfEmailConfirmRequestDto): Observable<SelfProfileDto> {
    return this.http.post<SelfProfileDto>('/api/me/email/confirm', dto);
  }

  getFollowers(page?: number, pageSize?: number): Observable<SelfFollowPageDto> {
    const params: Record<string, string> = {};
    if (page != null) params['Page'] = page.toString();
    if (pageSize != null) params['PageSize'] = pageSize.toString();
    return this.http.get<SelfFollowPageDto>('/api/me/followers', { params });
  }

  removeFollower(userId: string): Observable<SelfFollowerRemovalResultDto> {
    return this.http.delete<SelfFollowerRemovalResultDto>(`/api/me/followers/${userId}`);
  }

  getFollowing(page?: number, pageSize?: number): Observable<SelfFollowPageDto> {
    const params: Record<string, string> = {};
    if (page != null) params['Page'] = page.toString();
    if (pageSize != null) params['PageSize'] = pageSize.toString();
    return this.http.get<SelfFollowPageDto>('/api/me/following', { params });
  }
}
