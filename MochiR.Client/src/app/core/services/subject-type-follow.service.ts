import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FollowSubjectTypeSummaryDto } from '../../api/models/follow-subject-type-summary-dto';
import { FollowDeletionResultDto } from '../../api/models/follow-deletion-result-dto';
import { FollowSubjectTypePageDto } from '../../api/models/follow-subject-type-page-dto';

@Injectable({ providedIn: 'root' })
export class SubjectTypeFollowService {
  private readonly http = inject(HttpClient);

  followSubjectType(subjectTypeId: number): Observable<FollowSubjectTypeSummaryDto> {
    return this.http.post<FollowSubjectTypeSummaryDto>(
      `/api/follows/subject-types/${subjectTypeId}`,
      {},
    );
  }

  unfollowSubjectType(subjectTypeId: number): Observable<FollowDeletionResultDto> {
    return this.http.delete<FollowDeletionResultDto>(`/api/follows/subject-types/${subjectTypeId}`);
  }

  getFollowedSubjectTypes(page?: number, pageSize?: number): Observable<FollowSubjectTypePageDto> {
    const params: Record<string, string> = {};
    if (page != null) params['Page'] = page.toString();
    if (pageSize != null) params['PageSize'] = pageSize.toString();
    return this.http.get<FollowSubjectTypePageDto>('/api/follows/subject-types', { params });
  }
}
