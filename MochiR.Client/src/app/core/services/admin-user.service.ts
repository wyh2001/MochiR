import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DirectoryPageDto } from '../../api/models/directory-page-dto';
import { UserDirectoryResponseDto } from '../../api/models/user-directory-response-dto';
import { CreateUserDto } from '../../api/models/create-user-dto';
import { DirectoryAdminPatchRequestDto } from '../../api/models/directory-admin-patch-request-dto';
import { LockUserRequestDto } from '../../api/models/lock-user-request-dto';
import { UserLockResponseDto } from '../../api/models/user-lock-response-dto';
import { UserDeleteResponseDto } from '../../api/models/user-delete-response-dto';

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private readonly http = inject(HttpClient);

  getAll(params?: {
    query?: string;
    page?: number;
    pageSize?: number;
    sort?: string;
  }): Observable<DirectoryPageDto> {
    const httpParams: Record<string, string> = {};
    if (params?.query) httpParams['query'] = params.query;
    if (params?.page != null) httpParams['page'] = params.page.toString();
    if (params?.pageSize != null) httpParams['pageSize'] = params.pageSize.toString();
    if (params?.sort) httpParams['sort'] = params.sort;
    return this.http.get<DirectoryPageDto>('/api/users', { params: httpParams });
  }

  getById(id: string): Observable<UserDirectoryResponseDto> {
    return this.http.get<UserDirectoryResponseDto>(`/api/users/${id}`);
  }

  create(dto: CreateUserDto, context?: HttpContext): Observable<UserDirectoryResponseDto> {
    return this.http.post<UserDirectoryResponseDto>('/api/users', dto, { context });
  }

  update(
    id: string,
    dto: DirectoryAdminPatchRequestDto,
    context?: HttpContext,
  ): Observable<UserDirectoryResponseDto> {
    return this.http.patch<UserDirectoryResponseDto>(`/api/users/${id}`, dto, { context });
  }

  lock(id: string, dto: LockUserRequestDto): Observable<UserLockResponseDto> {
    return this.http.post<UserLockResponseDto>(`/api/users/${id}/lock`, dto);
  }

  delete(id: string): Observable<UserDeleteResponseDto> {
    return this.http.delete<UserDeleteResponseDto>(`/api/users/${id}`);
  }
}
