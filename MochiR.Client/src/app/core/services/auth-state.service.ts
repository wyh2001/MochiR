import { Injectable, computed, signal } from '@angular/core';

export interface UserProfile {
  id: string;
  userName: string;
  displayName: string;
  email: string;
  isAdmin: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  readonly user = signal<UserProfile | null>(null);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isAdmin = computed(() => this.user()?.isAdmin === true);

  setUser(profile: UserProfile): void {
    this.user.set(profile);
  }

  clear(): void {
    this.user.set(null);
  }
}
