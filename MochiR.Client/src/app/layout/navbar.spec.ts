import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Navbar } from './navbar';

describe('Navbar', () => {
  let fixture: ComponentFixture<Navbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
  });

  it('renders the app name', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.navbar-brand')?.textContent).toContain('MochiR');
  });

  it('contains navigation links', () => {
    const el: HTMLElement = fixture.nativeElement;
    const links = el.querySelectorAll('.nav-link');
    expect(links.length).toBeGreaterThan(0);
  });
});
