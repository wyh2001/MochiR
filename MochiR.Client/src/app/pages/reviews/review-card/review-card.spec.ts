import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReviewCard } from './review-card';

describe('ReviewCard', () => {
  let fixture: ComponentFixture<ReviewCard>;

  const mockReview = {
    id: 1,
    subjectId: 1,
    subjectName: 'Inception',
    userId: 'john',
    authorUserName: 'john',
    authorDisplayName: 'John Doe',
    authorAvatarUrl: null,
    title: 'Great movie',
    content: 'Full content here',
    excerpt: 'Great movie...',
    excerptIsAuto: true,
    ratings: [{ key: 'story', label: 'Story', score: 9 }],
    status: 1,
    tags: ['sci-fi', 'thriller'],
    likeCount: 5,
    isLikedByCurrentUser: false,
    createdAt: '2026-01-15T10:30:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewCard],
      providers: [provideRouter([{ path: '**', children: [] }])],
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewCard);
    fixture.componentRef.setInput('review', mockReview);
    fixture.detectChanges();
  });

  it('displays review title', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Great movie');
  });

  it('displays excerpt', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Great movie...');
  });

  it('displays author display name', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('John Doe');
  });

  it('displays subject name', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Inception');
  });

  it('displays ratings', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Story');
    expect(el.textContent).toContain('9');
  });

  it('displays like count', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('5');
  });

  it('displays tags', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('sci-fi');
    expect(el.textContent).toContain('thriller');
  });

  it('displays creation date', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('2026-01-15');
  });

  it('links to review detail page', () => {
    const link = fixture.nativeElement.querySelector('a[href="/reviews/1"]');
    expect(link).toBeTruthy();
  });
});
