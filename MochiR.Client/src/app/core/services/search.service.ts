import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SearchResponseDto } from '../../api/models/search-response-dto';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);

  search(params: {
    query: string;
    type?: string;
    sort?: string;
    limit?: number;
    cursor?: string;
  }): Observable<SearchResponseDto> {
    const queryParams: Record<string, string> = {};
    queryParams['Query'] = params.query;
    if (params.type != null) queryParams['Type'] = params.type;
    if (params.sort != null) queryParams['Sort'] = params.sort;
    if (params.limit != null) queryParams['Limit'] = params.limit.toString();
    if (params.cursor != null) queryParams['Cursor'] = params.cursor;
    return this.http.get<SearchResponseDto>('/api/search', { params: queryParams });
  }
}
