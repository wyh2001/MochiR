import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { SubjectDetail } from './subject-detail';
import { apiResponseInterceptor } from '../../../../core/interceptors/api-response.interceptor';
import { NotificationService } from '../../../../core/services/notification.service';

describe('SubjectDetail', () => {
  let fixture: ComponentFixture<SubjectDetail>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectDetail],
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

    fixture = TestBed.createComponent(SubjectDetail);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

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
    http.expectOne('/api/subjects/1').flush({
      success: true,
      data,
      error: null,
      traceId: '',
      timestampUtc: '',
    });
    fixture.detectChanges();
  }

  it('fetches and displays subject details', () => {
    fixture.detectChanges();
    flushDetail();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Inception');
    expect(el.textContent).toContain('inception');
    expect(el.textContent).toContain('movie');
    expect(el.textContent).toContain('Movie');
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
    http.expectOne('/api/subjects/1').flush({
      success: true,
      data: { ...mockDetail, attributes: [] },
      error: null,
      traceId: '',
      timestampUtc: '',
    });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No attributes');
  });

  it('shows createdAt date', () => {
    fixture.detectChanges();
    flushDetail();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('2026-01-15');
  });

  it('shows Edit and Delete buttons', () => {
    fixture.detectChanges();
    flushDetail();

    const editLink = fixture.nativeElement.querySelector('a[href="/admin/subjects/1/edit"]');
    expect(editLink).toBeTruthy();
    expect(editLink.textContent).toContain('Edit');

    const deleteBtn = fixture.nativeElement.querySelector('.btn-delete');
    expect(deleteBtn).toBeTruthy();
    expect(deleteBtn.textContent).toContain('Delete');
  });

  it('shows Back to list link', () => {
    fixture.detectChanges();
    flushDetail();

    const backLink = fixture.nativeElement.querySelector('a[href="/admin/subjects"]');
    expect(backLink).toBeTruthy();
    expect(backLink.textContent).toContain('Back');
  });

  it('shows error on subject not found', () => {
    fixture.detectChanges();
    http.expectOne('/api/subjects/1').flush({
      success: false,
      data: null,
      error: { code: 'SUBJECT_NOT_FOUND', message: 'Subject not found', details: null },
      traceId: '',
      timestampUtc: '',
    });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Subject not found');
    const backLink = el.querySelector('a[href="/admin/subjects"]');
    expect(backLink).toBeTruthy();
  });

  it('shows loading state', () => {
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Loading');

    flushDetail();
  });

  describe('delete confirmation', () => {
    let notification: NotificationService;

    beforeEach(() => {
      notification = TestBed.inject(NotificationService);
    });

    it('shows confirmation with warning when Delete is clicked', () => {
      fixture.detectChanges();
      flushDetail();

      const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('associated reviews');
      expect(el.querySelector('.btn-confirm-delete')).toBeTruthy();
      expect(el.querySelector('.btn-cancel-delete')).toBeTruthy();
    });

    it('sends DELETE request on confirm and shows notification', () => {
      fixture.detectChanges();
      flushDetail();

      const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      const confirmBtn: HTMLButtonElement =
        fixture.nativeElement.querySelector('.btn-confirm-delete');
      confirmBtn.click();

      const req = http.expectOne('/api/subjects/1');
      expect(req.request.method).toBe('DELETE');
      req.flush({
        success: true,
        data: { id: 1, deleted: true },
        error: null,
        traceId: '',
        timestampUtc: '',
      });

      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].type).toBe('success');
      expect(notification.notifications()[0].message).toContain('deleted');
    });

    it('hides confirmation when Cancel is clicked', () => {
      fixture.detectChanges();
      flushDetail();

      const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      const cancelBtn: HTMLButtonElement =
        fixture.nativeElement.querySelector('.btn-cancel-delete');
      cancelBtn.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.btn-confirm-delete')).toBeFalsy();
      expect(fixture.nativeElement.querySelector('.btn-delete')).toBeTruthy();
    });

    it('shows error on delete failure', () => {
      fixture.detectChanges();
      flushDetail();

      const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      const confirmBtn: HTMLButtonElement =
        fixture.nativeElement.querySelector('.btn-confirm-delete');
      confirmBtn.click();

      http.expectOne('/api/subjects/1').flush({
        success: false,
        data: null,
        error: {
          code: 'SUBJECT_DELETE_FAILED',
          message: 'Cannot delete subject',
          details: null,
        },
        traceId: '',
        timestampUtc: '',
      });
      fixture.detectChanges();

      const component = fixture.componentInstance;
      expect(component.error()).toBe('Cannot delete subject');
    });
  });
});
