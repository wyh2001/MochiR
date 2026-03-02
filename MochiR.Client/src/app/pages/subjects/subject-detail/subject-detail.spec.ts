import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { SubjectDetail } from './subject-detail';
import { apiResponseInterceptor } from '../../../core/interceptors/api-response.interceptor';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthStateService } from '../../../core/services/auth-state.service';

describe('SubjectDetail', () => {
  let fixture: ComponentFixture<SubjectDetail>;
  let http: HttpTestingController;
  let authState: AuthStateService;

  function createComponent(admin = false) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
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
    });

    authState = TestBed.inject(AuthStateService);
    if (admin) {
      authState.setUser({
        id: 'admin-1',
        userName: 'admin',
        displayName: 'Admin',
        email: 'admin@test.com',
        isAdmin: true,
      });
    }

    fixture = TestBed.createComponent(SubjectDetail);
    http = TestBed.inject(HttpTestingController);
  }

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

  function flushDetail(data: unknown = mockDetail) {
    http.expectOne('/api/subjects/1').flush(envelope(data));
    fixture.detectChanges();
  }

  describe('public view', () => {
    it('fetches and displays subject details', () => {
      createComponent();
      fixture.detectChanges();
      flushDetail();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Inception');
      expect(el.textContent).toContain('inception');
      expect(el.textContent).toContain('movie');
      expect(el.textContent).toContain('Movie');
    });

    it('displays attributes table', () => {
      createComponent();
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
      createComponent();
      fixture.detectChanges();
      flushDetail({ ...mockDetail, attributes: [] });

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('No attributes');
    });

    it('shows createdAt date', () => {
      createComponent();
      fixture.detectChanges();
      flushDetail();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('2026-01-15');
    });

    it('shows error on subject not found', () => {
      createComponent();
      fixture.detectChanges();
      http
        .expectOne('/api/subjects/1')
        .flush(errorEnvelope('SUBJECT_NOT_FOUND', 'Subject not found'));
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Subject not found');
      expect(el.querySelector('a[href="/subjects"]')).toBeTruthy();
    });

    it('shows loading state', () => {
      createComponent();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Loading');

      flushDetail();
    });

    it('does not show Edit or Delete buttons for non-admin', () => {
      createComponent(false);
      fixture.detectChanges();
      flushDetail();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.btn-delete')).toBeFalsy();
      expect(el.querySelector('a[href*="edit"]')).toBeFalsy();
    });
  });

  describe('admin view', () => {
    it('shows Edit and Delete buttons for admin', () => {
      createComponent(true);
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
      createComponent(true);
      fixture.detectChanges();
      flushDetail();

      const backLink = fixture.nativeElement.querySelector('a[href="/subjects"]');
      expect(backLink).toBeTruthy();
      expect(backLink.textContent).toContain('Back');
    });

    it('shows confirmation with warning when Delete is clicked', () => {
      createComponent(true);
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
      createComponent(true);
      fixture.detectChanges();
      flushDetail();

      const notification = TestBed.inject(NotificationService);

      const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      const confirmBtn: HTMLButtonElement =
        fixture.nativeElement.querySelector('.btn-confirm-delete');
      confirmBtn.click();

      const req = http.expectOne('/api/subjects/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope({ id: 1, deleted: true }));

      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].type).toBe('success');
      expect(notification.notifications()[0].message).toContain('deleted');
    });

    it('hides confirmation when Cancel is clicked', () => {
      createComponent(true);
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
      createComponent(true);
      fixture.detectChanges();
      flushDetail();

      const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      const confirmBtn: HTMLButtonElement =
        fixture.nativeElement.querySelector('.btn-confirm-delete');
      confirmBtn.click();

      http
        .expectOne('/api/subjects/1')
        .flush(errorEnvelope('SUBJECT_DELETE_FAILED', 'Cannot delete subject'));
      fixture.detectChanges();

      expect(fixture.componentInstance.error()).toBe('Cannot delete subject');
    });
  });
});
