import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
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

  create(dto: CreateSubjectTypeDto, context?: HttpContext): Observable<SubjectTypeSummaryDto> {
    return this.http.post<SubjectTypeSummaryDto>('/api/subject-types', dto, { context });
  }

  update(
    id: number,
    dto: UpdateSubjectTypeDto,
    context?: HttpContext,
  ): Observable<SubjectTypeSummaryDto> {
    return this.http.put<SubjectTypeSummaryDto>(`/api/subject-types/${id}`, dto, { context });
  }

  delete(id: number): Observable<SubjectTypeDeleteResultDto> {
    return this.http.delete<SubjectTypeDeleteResultDto>(`/api/subject-types/${id}`);
  }
}
