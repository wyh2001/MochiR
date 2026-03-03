import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubjectAggregateDto } from '../../api/models/subject-aggregate-dto';

@Injectable({ providedIn: 'root' })
export class RatingService {
  private readonly http = inject(HttpClient);

  getAggregate(subjectId: number): Observable<SubjectAggregateDto> {
    return this.http.get<SubjectAggregateDto>(`/api/ratings/subjects/${subjectId}`);
  }
}
