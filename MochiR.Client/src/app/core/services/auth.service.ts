import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, of, map, tap, catchError } from 'rxjs';
import { AuthStateService, UserProfile } from './auth-state.service';
import { SKIP_AUTH_REDIRECT } from '../interceptors/auth-redirect.interceptor';
import { SelfProfileDto } from '../../api/models/self-profile-dto';
import { LoginDto } from '../../api/models/login-dto';
import { RegisterDto } from '../../api/models/register-dto';
import { PasswordResetTokenRequestDto } from '../../api/models/password-reset-token-request-dto';
import { PasswordResetConfirmRequestDto } from '../../api/models/password-reset-confirm-request-dto';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

  login(dto: LoginDto, context?: HttpContext): Observable<void> {
    const ctx = (context ?? new HttpContext()).set(SKIP_AUTH_REDIRECT, true);
    return this.http
      .post<void>('/api/auth/login', dto, { context: ctx })
      .pipe(tap(() => this.fetchProfile()));
  }

  register(dto: RegisterDto, context?: HttpContext): Observable<void> {
    return this.http.post<void>('/api/auth/register', dto, { context }).pipe(map(() => undefined));
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}).pipe(tap(() => this.authState.clear()));
  }

  requestPasswordReset(dto: PasswordResetTokenRequestDto): Observable<void> {
    return this.http.post<void>('/api/auth/password/reset/request', dto).pipe(map(() => undefined));
  }

  confirmPasswordReset(
    dto: PasswordResetConfirmRequestDto,
    context?: HttpContext,
  ): Observable<void> {
    return this.http
      .post<void>('/api/auth/password/reset/confirm', dto, { context })
      .pipe(map(() => undefined));
  }

  bootstrap(): Observable<void> {
    return this.http
      .get<SelfProfileDto>('/api/me', { context: new HttpContext().set(SKIP_AUTH_REDIRECT, true) })
      .pipe(
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
      id: dto.id,
      userName: dto.userName ?? '',
      displayName: dto.displayName ?? dto.userName ?? '',
      email: dto.email ?? '',
      isAdmin: dto.isAdmin,
    };
  }
}
