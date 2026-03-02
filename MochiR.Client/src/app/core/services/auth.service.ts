import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, tap, catchError } from 'rxjs';
import { AuthStateService, UserProfile } from './auth-state.service';
import { SelfProfileDto } from '../../api/models/self-profile-dto';
import { LoginDto } from '../../api/models/login-dto';
import { RegisterDto } from '../../api/models/register-dto';
import { PasswordResetTokenRequestDto } from '../../api/models/password-reset-token-request-dto';
import { PasswordResetConfirmRequestDto } from '../../api/models/password-reset-confirm-request-dto';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

  login(dto: LoginDto): Observable<void> {
    return this.http.post<void>('/api/auth/login', dto).pipe(tap(() => this.fetchProfile()));
  }

  register(dto: RegisterDto): Observable<void> {
    return this.http.post<void>('/api/auth/register', dto).pipe(map(() => undefined));
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}).pipe(tap(() => this.authState.clear()));
  }

  requestPasswordReset(dto: PasswordResetTokenRequestDto): Observable<void> {
    return this.http.post<void>('/api/auth/password/reset/request', dto).pipe(map(() => undefined));
  }

  confirmPasswordReset(dto: PasswordResetConfirmRequestDto): Observable<void> {
    return this.http.post<void>('/api/auth/password/reset/confirm', dto).pipe(map(() => undefined));
  }

  bootstrap(): Observable<void> {
    return this.http.get<SelfProfileDto>('/api/me').pipe(
      tap((profile) => this.authState.setUser(this.mapProfile(profile))),
      map(() => undefined),
      catchError(() => {
        this.authState.clear();
        return of(undefined);
      }),
    );
  }

  private fetchProfile(): void {
    this.http
      .get<SelfProfileDto>('/api/me')
      .pipe(
        tap((profile) => this.authState.setUser(this.mapProfile(profile))),
        catchError(() => of(undefined)),
      )
      .subscribe();
  }

  private mapProfile(dto: SelfProfileDto): UserProfile {
    return {
      userName: dto.userName ?? '',
      displayName: dto.displayName ?? dto.userName ?? '',
      email: dto.email ?? '',
      isAdmin: false,
    };
  }
}
