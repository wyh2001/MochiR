import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FollowSubjectSummaryDto } from '../../api/models/follow-subject-summary-dto';
import { FollowDeletionResultDto } from '../../api/models/follow-deletion-result-dto';
import { FollowSubjectPageDto } from '../../api/models/follow-subject-page-dto';

@Injectable({ providedIn: 'root' })
export class SubjectFollowService {
  private readonly http = inject(HttpClient);

  followSubject(subjectId: number): Observable<FollowSubjectSummaryDto> {
    return this.http.post<FollowSubjectSummaryDto>(`/api/follows/subjects/${subjectId}`, {});
  }

  unfollowSubject(subjectId: number): Observable<FollowDeletionResultDto> {
    return this.http.delete<FollowDeletionResultDto>(`/api/follows/subjects/${subjectId}`);
  }

  getFollowedSubjects(page?: number, pageSize?: number): Observable<FollowSubjectPageDto> {
    const params: Record<string, string> = {};
    if (page != null) params['Page'] = page.toString();
    if (pageSize != null) params['PageSize'] = pageSize.toString();
    return this.http.get<FollowSubjectPageDto>('/api/follows/subjects', { params });
  }
}
