import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Navbar } from './navbar';
import { AuthStateService } from '../core/services/auth-state.service';

describe('Navbar', () => {
  let fixture: ComponentFixture<Navbar>;
  let authState: AuthStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    authState = TestBed.inject(AuthStateService);
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
});
