import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubjectTypeSummaryDto } from '../../api/models/subject-type-summary-dto';
import { CreateSubjectTypeDto } from '../../api/models/create-subject-type-dto';
import { UpdateSubjectTypeDto } from '../../api/models/update-subject-type-dto';
import { SubjectTypeDeleteResultDto } from '../../api/models/subject-type-delete-result-dto';

@Injectable({ providedIn: 'root' })
export class SubjectTypeService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<SubjectTypeSummaryDto[]> {
    return this.http.get<SubjectTypeSummaryDto[]>('/api/subject-types');
  }

  create(dto: CreateSubjectTypeDto): Observable<SubjectTypeSummaryDto> {
    return this.http.post<SubjectTypeSummaryDto>('/api/subject-types', dto);
  }

  update(id: number, dto: UpdateSubjectTypeDto): Observable<SubjectTypeSummaryDto> {
    return this.http.put<SubjectTypeSummaryDto>(`/api/subject-types/${id}`, dto);
  }

  delete(id: number): Observable<SubjectTypeDeleteResultDto> {
    return this.http.delete<SubjectTypeDeleteResultDto>(`/api/subject-types/${id}`);
  }
}
