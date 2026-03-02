import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { Navbar } from './navbar';
import { AuthStateService } from '../core/services/auth-state.service';

describe('Navbar', () => {
  let fixture: ComponentFixture<Navbar>;
  let authState: AuthStateService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
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
