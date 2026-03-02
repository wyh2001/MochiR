import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubjectSummaryDto } from '../../api/models/subject-summary-dto';
import { SubjectDetailDto } from '../../api/models/subject-detail-dto';
import { CreateSubjectDto } from '../../api/models/create-subject-dto';
import { UpdateSubjectDto } from '../../api/models/update-subject-dto';
import { SubjectDeleteResultDto } from '../../api/models/subject-delete-result-dto';

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private readonly http = inject(HttpClient);

  getAll(subjectTypeId?: number): Observable<SubjectSummaryDto[]> {
    const params: Record<string, string> = {};
    if (subjectTypeId != null) {
      params['subjectTypeId'] = subjectTypeId.toString();
    }
    return this.http.get<SubjectSummaryDto[]>('/api/subjects', { params });
  }

  getById(id: number): Observable<SubjectDetailDto> {
    return this.http.get<SubjectDetailDto>(`/api/subjects/${id}`);
  }

  create(dto: CreateSubjectDto): Observable<SubjectSummaryDto> {
    return this.http.post<SubjectSummaryDto>('/api/subjects', dto);
  }

  update(id: number, dto: UpdateSubjectDto): Observable<SubjectSummaryDto> {
    return this.http.put<SubjectSummaryDto>(`/api/subjects/${id}`, dto);
  }

  delete(id: number): Observable<SubjectDeleteResultDto> {
    return this.http.delete<SubjectDeleteResultDto>(`/api/subjects/${id}`);
  }
}
