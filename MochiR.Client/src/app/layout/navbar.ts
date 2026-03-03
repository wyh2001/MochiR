import { Component, DestroyRef, ElementRef, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AuthStateService } from '../core/services/auth-state.service';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
})
export class Navbar {
  protected readonly auth = inject(AuthStateService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  searchQuery = '';
  navCollapsed = signal(true);
  adminDropdownOpen = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.navCollapsed.set(true);
        this.adminDropdownOpen.set(false);
      });
  }

  toggleNav(): void {
    this.navCollapsed.update((v) => !v);
  }

  toggleAdminDropdown(event: Event): void {
    event.stopPropagation();
    this.adminDropdownOpen.update((v) => !v);
  }

  @HostListener('document:click')
  closeDropdowns(): void {
    this.adminDropdownOpen.set(false);
  }

  onDropdownKeydown(): void {
    this.adminDropdownOpen.set(false);
    const toggle = this.el.nativeElement.querySelector('.dropdown-toggle') as HTMLElement;
    toggle?.focus();
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigateByUrl('/login');
    });
  }

  onSearch(event: Event): void {
    event.preventDefault();
    const q = this.searchQuery.trim();
    if (q) {
      this.router.navigateByUrl('/search?q=' + encodeURIComponent(q));
    }
  }
}
