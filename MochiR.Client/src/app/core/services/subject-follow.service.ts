import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FollowSubjectRelationshipDto } from '../../api/models/follow-subject-relationship-dto';
import { FollowSubjectPageDto } from '../../api/models/follow-subject-page-dto';

@Injectable({ providedIn: 'root' })
export class SubjectFollowService {
  private readonly http = inject(HttpClient);

  followSubject(subjectId: number): Observable<FollowSubjectRelationshipDto> {
    return this.http.post<FollowSubjectRelationshipDto>(`/api/follows/subjects/${subjectId}`, {});
  }

  unfollowSubject(subjectId: number): Observable<FollowSubjectRelationshipDto> {
    return this.http.delete<FollowSubjectRelationshipDto>(`/api/follows/subjects/${subjectId}`);
  }

  getFollowedSubjects(page?: number, pageSize?: number): Observable<FollowSubjectPageDto> {
    const params: Record<string, string> = {};
    if (page != null) params['Page'] = page.toString();
    if (pageSize != null) params['PageSize'] = pageSize.toString();
    return this.http.get<FollowSubjectPageDto>('/api/follows/subjects', { params });
  }

  getRelationships(subjectIds: number[]): Observable<FollowSubjectRelationshipDto[]> {
    const params: Record<string, string | string[]> = {};
    if (subjectIds.length > 0) {
      params['subjectIds'] = subjectIds.map((id) => id.toString());
    }

    return this.http.get<FollowSubjectRelationshipDto[]>('/api/follows/subjects/relationships', {
      params,
    });
  }
}
