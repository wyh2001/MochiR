import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotFound } from './not-found';

describe('NotFound', () => {
  let fixture: ComponentFixture<NotFound>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFound],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFound);
    fixture.detectChanges();
  });

  it('renders Page Not Found text', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Page Not Found');
  });

  it('contains a link to the home page', () => {
    const el: HTMLElement = fixture.nativeElement;
    const link = el.querySelector('a[href="/"]');
    expect(link).toBeTruthy();
  });
});
