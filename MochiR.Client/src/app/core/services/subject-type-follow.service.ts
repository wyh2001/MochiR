import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FollowSubjectTypeRelationshipDto } from '../../api/models/follow-subject-type-relationship-dto';
import { FollowSubjectTypePageDto } from '../../api/models/follow-subject-type-page-dto';

@Injectable({ providedIn: 'root' })
export class SubjectTypeFollowService {
  private readonly http = inject(HttpClient);

  followSubjectType(subjectTypeId: number): Observable<FollowSubjectTypeRelationshipDto> {
    return this.http.post<FollowSubjectTypeRelationshipDto>(
      `/api/follows/subject-types/${subjectTypeId}`,
      {},
    );
  }

  unfollowSubjectType(subjectTypeId: number): Observable<FollowSubjectTypeRelationshipDto> {
    return this.http.delete<FollowSubjectTypeRelationshipDto>(
      `/api/follows/subject-types/${subjectTypeId}`,
    );
  }

  getFollowedSubjectTypes(page?: number, pageSize?: number): Observable<FollowSubjectTypePageDto> {
    const params: Record<string, string> = {};
    if (page != null) params['Page'] = page.toString();
    if (pageSize != null) params['PageSize'] = pageSize.toString();
    return this.http.get<FollowSubjectTypePageDto>('/api/follows/subject-types', { params });
  }

  getRelationships(subjectTypeIds: number[]): Observable<FollowSubjectTypeRelationshipDto[]> {
    const params: Record<string, string | string[]> = {};
    if (subjectTypeIds.length > 0) {
      params['subjectTypeIds'] = subjectTypeIds.map((id) => id.toString());
    }

    return this.http.get<FollowSubjectTypeRelationshipDto[]>(
      '/api/follows/subject-types/relationships',
      { params },
    );
  }
}
