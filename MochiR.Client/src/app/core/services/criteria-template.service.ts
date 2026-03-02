import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CriteriaTemplateSummaryDto } from '../../api/models/criteria-template-summary-dto';
import { CriteriaTemplateDetailDto } from '../../api/models/criteria-template-detail-dto';
import { CreateCriteriaTemplateDto } from '../../api/models/create-criteria-template-dto';

@Injectable({ providedIn: 'root' })
export class CriteriaTemplateService {
  private readonly http = inject(HttpClient);

  getAll(subjectTypeId?: number): Observable<CriteriaTemplateSummaryDto[]> {
    const params: Record<string, string> = {};
    if (subjectTypeId != null) {
      params['subjectTypeId'] = subjectTypeId.toString();
    }
    return this.http.get<CriteriaTemplateSummaryDto[]>('/api/criteria-templates', { params });
  }

  getById(id: number): Observable<CriteriaTemplateDetailDto> {
    return this.http.get<CriteriaTemplateDetailDto>(`/api/criteria-templates/${id}`);
  }

  create(dto: CreateCriteriaTemplateDto): Observable<CriteriaTemplateSummaryDto> {
    return this.http.post<CriteriaTemplateSummaryDto>('/api/criteria-templates', dto);
  }
}
