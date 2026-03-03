import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';

export interface SetupStatusDto {
  needsSetup: boolean;
}

export interface CreateInitialAdminRequestDto {
  userName: string;
  email: string;
  password: string;
}

export interface CreateInitialAdminResponseDto {
  userId: string;
  userName: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class SetupService {
  private readonly http = inject(HttpClient);
  private cachedStatus: SetupStatusDto | null = null;

  getStatus(): Observable<SetupStatusDto> {
    if (this.cachedStatus && !this.cachedStatus.needsSetup) {
      return of(this.cachedStatus);
    }

    return this.http.get<SetupStatusDto>('/api/setup/status').pipe(
      tap((status) => {
        this.cachedStatus = status;
      }),
    );
  }

  createInitialAdmin(
    dto: CreateInitialAdminRequestDto,
    setupKey: string,
  ): Observable<CreateInitialAdminResponseDto> {
    const headers = new HttpHeaders({ 'X-Setup-Key': setupKey });
    return this.http.post<CreateInitialAdminResponseDto>('/api/setup/admin', dto, { headers }).pipe(
      tap(() => {
        this.cachedStatus = { needsSetup: false };
      }),
    );
  }
}
