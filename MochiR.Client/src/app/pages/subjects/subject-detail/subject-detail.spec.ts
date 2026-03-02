import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { PublicSubjectDetail } from './subject-detail';
import { apiResponseInterceptor } from '../../../core/interceptors/api-response.interceptor';

describe('PublicSubjectDetail', () => {
  let fixture: ComponentFixture<PublicSubjectDetail>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicSubjectDetail],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: '1' }),
            snapshot: { params: { id: '1' } },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicSubjectDetail);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const envelope = (data: unknown) => ({
    success: true,
    data,
    error: null,
    traceId: '',
    timestampUtc: '',
  });

  const errorEnvelope = (code: string, message: string) => ({
    success: false,
    data: null,
    error: { code, message, details: null },
    traceId: '',
    timestampUtc: '',
  });

  const mockDetail = {
    id: 1,
    name: 'Inception',
    slug: 'inception',
    subjectTypeId: 1,
    subjectTypeKey: 'movie',
    subjectTypeDisplayName: 'Movie',
    attributes: [
      { key: 'director', value: 'Christopher Nolan', note: 'Also producer' },
      { key: 'year', value: '2010', note: null },
    ],
    createdAt: '2026-01-15T10:30:00Z',
  };

  function flushDetail(data: unknown = mockDetail) {
    http.expectOne('/api/subjects/1').flush(envelope(data));
    fixture.detectChanges();
  }

  it('shows loading state before API responds', () => {
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Loading');

    flushDetail();
  });

  it('fetches and displays subject details', () => {
    fixture.detectChanges();
    flushDetail();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Inception');
    expect(el.textContent).toContain('inception');
    expect(el.textContent).toContain('Movie');
    expect(el.textContent).toContain('2026-01-15');
  });

  it('displays attributes table', () => {
    fixture.detectChanges();
    flushDetail();

    const rows = fixture.nativeElement.querySelectorAll('.attributes-table tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('director');
    expect(rows[0].textContent).toContain('Christopher Nolan');
    expect(rows[0].textContent).toContain('Also producer');
    expect(rows[1].textContent).toContain('year');
    expect(rows[1].textContent).toContain('2010');
  });

  it('shows no attributes message when empty', () => {
    fixture.detectChanges();
    flushDetail({ ...mockDetail, attributes: [] });

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No attributes');
  });

  it('shows error on subject not found', () => {
    fixture.detectChanges();
    http
      .expectOne('/api/subjects/1')
      .flush(errorEnvelope('SUBJECT_NOT_FOUND', 'Subject not found'));
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Subject not found');
  });

  it('does not show Edit or Delete buttons', () => {
    fixture.detectChanges();
    flushDetail();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.btn-delete')).toBeFalsy();
    expect(el.textContent).not.toContain('Edit');
    expect(el.textContent).not.toContain('Delete');
  });

  it('is accessible without authentication (no guard on route)', () => {
    fixture.detectChanges();
    flushDetail();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Inception');
  });
});
