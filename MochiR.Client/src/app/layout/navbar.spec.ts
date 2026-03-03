import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { Navbar } from './navbar';
import { AuthStateService } from '../core/services/auth-state.service';

@Component({ template: '', standalone: true })
class DummyComponent {}

describe('Navbar', () => {
  let fixture: ComponentFixture<Navbar>;
  let authState: AuthStateService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([
          { path: '', component: DummyComponent },
          { path: 'subjects', component: DummyComponent },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    authState = TestBed.inject(AuthStateService);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
  });

  it('renders the app name', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.navbar-brand')?.textContent).toContain('MochiR');
  });

  it('shows login/register links for guests', () => {
    const el: HTMLElement = fixture.nativeElement;
    const links = el.querySelectorAll('.nav-link');
    const texts = Array.from(links).map((l) => l.textContent?.trim());
    expect(texts).toContain('Login');
    expect(texts).toContain('Register');
  });

  it('shows username and logout button when authenticated', () => {
    authState.setUser({
      id: 'user-1',
      userName: 'testuser',
      displayName: 'Test User',
      email: 'test@test.com',
      isAdmin: false,
    });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('testuser');
    expect(el.querySelector('.btn')?.textContent?.trim()).toBe('Logout');
  });

  describe('Navigation links', () => {
    it('shows public links (Home, Subjects) for guest', () => {
      const el: HTMLElement = fixture.nativeElement;
      const links = el.querySelectorAll('.navbar-nav.me-auto .nav-link');
      const texts = Array.from(links).map((l) => l.textContent?.trim());
      expect(texts).toContain('Home');
      expect(texts).toContain('Subjects');
    });

    it('does NOT show auth-only links for guest', () => {
      const el: HTMLElement = fixture.nativeElement;
      const links = el.querySelectorAll('.navbar-nav.me-auto .nav-link');
      const texts = Array.from(links).map((l) => l.textContent?.trim());
      expect(texts).not.toContain('My Follows');
      expect(texts).not.toContain('Write Review');
      expect(texts).not.toContain('Admin');
    });
  });

  describe('Authenticated user links (US2)', () => {
    it('shows My Follows and Write Review links when authenticated', () => {
      authState.setUser({
        id: 'user-1',
        userName: 'testuser',
        displayName: 'Test User',
        email: 'test@test.com',
        isAdmin: false,
      });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const links = el.querySelectorAll('.navbar-nav.me-auto .nav-link');
      const texts = Array.from(links).map((l) => l.textContent?.trim());
      expect(texts).toContain('My Follows');
      expect(texts).toContain('Write Review');
    });

    it('username links to /profile', () => {
      authState.setUser({
        id: 'user-1',
        userName: 'testuser',
        displayName: 'Test User',
        email: 'test@test.com',
        isAdmin: false,
      });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const profileLink = el.querySelector('a.nav-link[href="/profile"]') as HTMLAnchorElement;
      expect(profileLink).toBeTruthy();
      expect(profileLink.textContent?.trim()).toBe('testuser');
    });
  });

  describe('Admin dropdown (US3)', () => {
    const adminUser = {
      id: 'admin-1',
      userName: 'admin',
      displayName: 'Admin',
      email: 'admin@test.com',
      isAdmin: true,
    };

    it('shows Admin dropdown for admin user', () => {
      authState.setUser(adminUser);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const toggle = el.querySelector('.dropdown-toggle');
      expect(toggle).toBeTruthy();
      expect(toggle?.textContent?.trim()).toBe('Admin');
    });

    it('does NOT show Admin dropdown for non-admin user', () => {
      authState.setUser({
        id: 'user-1',
        userName: 'testuser',
        displayName: 'Test User',
        email: 'test@test.com',
        isAdmin: false,
      });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.dropdown-toggle')).toBeNull();
    });

    it('Admin dropdown toggles on click', () => {
      authState.setUser(adminUser);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const toggle = el.querySelector('.dropdown-toggle') as HTMLElement;
      const menu = el.querySelector('.dropdown-menu') as HTMLElement;

      expect(menu.classList.contains('show')).toBe(false);

      toggle.click();
      fixture.detectChanges();
      expect(menu.classList.contains('show')).toBe(true);

      toggle.click();
      fixture.detectChanges();
      expect(menu.classList.contains('show')).toBe(false);
    });

    it('Admin dropdown closes on outside click', () => {
      authState.setUser(adminUser);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const toggle = el.querySelector('.dropdown-toggle') as HTMLElement;
      const menu = el.querySelector('.dropdown-menu') as HTMLElement;

      toggle.click();
      fixture.detectChanges();
      expect(menu.classList.contains('show')).toBe(true);

      document.dispatchEvent(new Event('click'));
      fixture.detectChanges();
      expect(menu.classList.contains('show')).toBe(false);
    });
  });

  describe('Mobile hamburger (US5)', () => {
    it('hamburger toggles mobile nav collapse', () => {
      const el: HTMLElement = fixture.nativeElement;
      const toggler = el.querySelector('.navbar-toggler') as HTMLElement;
      const collapse = el.querySelector('.navbar-collapse') as HTMLElement;

      expect(collapse.classList.contains('collapse')).toBe(true);
      expect(collapse.classList.contains('show')).toBe(false);

      toggler.click();
      fixture.detectChanges();
      expect(collapse.classList.contains('show')).toBe(true);

      toggler.click();
      fixture.detectChanges();
      expect(collapse.classList.contains('show')).toBe(false);
    });

    it('mobile menu collapses on navigation', async () => {
      const el: HTMLElement = fixture.nativeElement;
      const toggler = el.querySelector('.navbar-toggler') as HTMLElement;
      const collapse = el.querySelector('.navbar-collapse') as HTMLElement;

      toggler.click();
      fixture.detectChanges();
      expect(collapse.classList.contains('show')).toBe(true);

      await router.navigateByUrl('/');
      fixture.detectChanges();
      expect(collapse.classList.contains('show')).toBe(false);
    });
  });

  describe('Accessibility (US4)', () => {
    it('nav has aria-label "Main navigation"', () => {
      const el: HTMLElement = fixture.nativeElement;
      const nav = el.querySelector('nav');
      expect(nav?.getAttribute('aria-label')).toBe('Main navigation');
    });

    it('Admin dropdown toggle has aria-expanded', () => {
      authState.setUser({
        id: 'admin-1',
        userName: 'admin',
        displayName: 'Admin',
        email: 'admin@test.com',
        isAdmin: true,
      });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const toggle = el.querySelector('.dropdown-toggle') as HTMLElement;

      expect(toggle.getAttribute('aria-expanded')).toBe('false');

      toggle.click();
      fixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
    });

    it('hamburger has aria-label and aria-expanded', () => {
      const el: HTMLElement = fixture.nativeElement;
      const toggler = el.querySelector('.navbar-toggler') as HTMLElement;
      expect(toggler.getAttribute('aria-label')).toBe('Toggle navigation');
      expect(toggler.hasAttribute('aria-expanded')).toBe(true);
    });

    it('active link has aria-current="page"', async () => {
      await router.navigateByUrl('/');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const homeLink = el.querySelector('.navbar-nav .nav-link[href="/"]') as HTMLElement;
      expect(homeLink?.getAttribute('aria-current')).toBe('page');
    });

    it('Escape closes admin dropdown and refocuses toggle', () => {
      authState.setUser({
        id: 'admin-1',
        userName: 'admin',
        displayName: 'Admin',
        email: 'admin@test.com',
        isAdmin: true,
      });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const toggle = el.querySelector('.dropdown-toggle') as HTMLElement;
      const menu = el.querySelector('.dropdown-menu') as HTMLElement;

      toggle.click();
      fixture.detectChanges();
      expect(menu.classList.contains('show')).toBe(true);

      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(menu.classList.contains('show')).toBe(false);
      expect(document.activeElement).toBe(toggle);
    });
  });

  describe('Search bar (US2)', () => {
    it('shows a search input in the navbar', () => {
      const el: HTMLElement = fixture.nativeElement;
      const searchInput = el.querySelector(
        'input[type="search"], input.navbar-search-input',
      ) as HTMLInputElement;
      expect(searchInput).toBeTruthy();
    });

    it('submitting with query navigates to /search?q=<query>', () => {
      const navigateSpy = vi.spyOn(router, 'navigateByUrl');

      const el: HTMLElement = fixture.nativeElement;
      const searchInput = el.querySelector(
        'input[type="search"], input.navbar-search-input',
      ) as HTMLInputElement;
      searchInput.value = 'inception';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const form = el.querySelector('form.navbar-search-form') as HTMLFormElement;
      expect(form).toBeTruthy();
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(navigateSpy).toHaveBeenCalledWith('/search?q=inception');
    });

    it('submitting with empty query does not navigate', () => {
      const navigateSpy = vi.spyOn(router, 'navigateByUrl');

      const el: HTMLElement = fixture.nativeElement;
      const searchInput = el.querySelector(
        'input[type="search"], input.navbar-search-input',
      ) as HTMLInputElement;
      searchInput.value = '   ';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const form = el.querySelector('form.navbar-search-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('submitting with whitespace-only query does not navigate', () => {
      const navigateSpy = vi.spyOn(router, 'navigateByUrl');

      const el: HTMLElement = fixture.nativeElement;
      const searchInput = el.querySelector(
        'input[type="search"], input.navbar-search-input',
      ) as HTMLInputElement;
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const form = el.querySelector('form.navbar-search-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });
});
