import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SubjectTypeList } from './subject-type-list';
import { apiResponseInterceptor } from '../../../../core/interceptors/api-response.interceptor';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';

describe('SubjectTypeList', () => {
  let fixture: ComponentFixture<SubjectTypeList>;
  let http: HttpTestingController;
  let authState: AuthStateService;

  function createComponent(admin = false) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SubjectTypeList],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
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

    fixture = TestBed.createComponent(SubjectTypeList);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => http.verify());

  const envelope = (data: unknown) => ({
    success: true,
    data,
    error: null,
    traceId: '',
    timestampUtc: '',
  });

  function flushList(data: unknown[]) {
    http.expectOne('/api/subject-types').flush(envelope(data));
    fixture.detectChanges();
  }

  describe('public view', () => {
    it('renders a table with subject types', () => {
      createComponent();
      fixture.detectChanges();
      flushList([
        { id: 1, key: 'movie', displayName: 'Movie' },
        { id: 2, key: 'book', displayName: 'Book' },
      ]);

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('movie');
      expect(rows[0].textContent).toContain('Movie');
      expect(rows[1].textContent).toContain('book');
    });

    it('shows empty state when no subject types exist', () => {
      createComponent();
      fixture.detectChanges();
      flushList([]);

      expect(fixture.nativeElement.textContent).toContain('No subject types found');
    });

    it('shows loading state while fetching', () => {
      createComponent();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Loading');

      flushList([]);
    });

    it('does not show Create button for non-admin', () => {
      createComponent(false);
      fixture.detectChanges();
      flushList([]);

      const link = fixture.nativeElement.querySelector('a[href="/admin/subject-types/new"]');
      expect(link).toBeFalsy();
    });

    it('does not show Actions column for non-admin', () => {
      createComponent(false);
      fixture.detectChanges();
      flushList([{ id: 1, key: 'movie', displayName: 'Movie' }]);

      const headers = fixture.nativeElement.querySelectorAll('thead th');
      const texts = Array.from(headers).map((h: unknown) => (h as HTMLElement).textContent);
      expect(texts).not.toContain('Actions');
    });
  });

  describe('admin view', () => {
    it('shows Create button for admin', () => {
      createComponent(true);
      fixture.detectChanges();
      flushList([]);

      const link = fixture.nativeElement.querySelector('a[href="/admin/subject-types/new"]');
      expect(link).toBeTruthy();
      expect(link.textContent).toContain('Create');
    });

    it('shows Edit and Delete buttons per row', () => {
      createComponent(true);
      fixture.detectChanges();
      flushList([{ id: 1, key: 'movie', displayName: 'Movie' }]);

      const row = fixture.nativeElement.querySelector('tbody tr');
      expect(row.textContent).toContain('Edit');
      expect(row.textContent).toContain('Delete');
    });

    it('shows inline confirmation when Delete is clicked', () => {
      createComponent(true);
      fixture.detectChanges();
      flushList([
        { id: 1, key: 'movie', displayName: 'Movie' },
        { id: 2, key: 'book', displayName: 'Book' },
      ]);

      const deleteBtn = fixture.nativeElement.querySelector('.btn-outline-danger');
      deleteBtn.click();
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('tbody tr');
      expect(row.textContent).toContain('Are you sure?');
      expect(row.textContent).toContain('Confirm');
      expect(row.textContent).toContain('Cancel');
    });

    it('hides confirmation when Cancel is clicked', () => {
      createComponent(true);
      fixture.detectChanges();
      flushList([{ id: 1, key: 'movie', displayName: 'Movie' }]);

      const deleteBtn = fixture.nativeElement.querySelector('.btn-outline-danger');
      deleteBtn.click();
      fixture.detectChanges();

      const cancelBtn = fixture.nativeElement.querySelector('.btn-secondary');
      cancelBtn.click();
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('tbody tr');
      expect(row.textContent).not.toContain('Are you sure?');
      expect(row.textContent).toContain('Delete');
    });

    it('calls DELETE API and removes row on confirm', () => {
      createComponent(true);
      fixture.detectChanges();
      flushList([
        { id: 1, key: 'movie', displayName: 'Movie' },
        { id: 2, key: 'book', displayName: 'Book' },
      ]);

      const deleteBtn = fixture.nativeElement.querySelector('.btn-outline-danger');
      deleteBtn.click();
      fixture.detectChanges();

      const confirmBtn = fixture.nativeElement.querySelector('.btn-danger');
      confirmBtn.click();

      const req = http.expectOne('/api/subject-types/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(envelope({ id: 1, deleted: true }));

      flushList([{ id: 2, key: 'book', displayName: 'Book' }]);

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('book');
    });

    it('shows error notification on delete failure', () => {
      createComponent(true);
      fixture.detectChanges();
      flushList([{ id: 1, key: 'movie', displayName: 'Movie' }]);

      const deleteBtn = fixture.nativeElement.querySelector('.btn-outline-danger');
      deleteBtn.click();
      fixture.detectChanges();

      const confirmBtn = fixture.nativeElement.querySelector('.btn-danger');
      confirmBtn.click();

      http.expectOne('/api/subject-types/1').flush({
        success: false,
        data: null,
        error: { code: 'DELETE_FAILED', message: 'Cannot delete', details: null },
        traceId: '',
        timestampUtc: '',
      });
      fixture.detectChanges();

      const notificationService = TestBed.inject(NotificationService);
      expect(notificationService.notifications().length).toBe(1);
      expect(notificationService.notifications()[0].type).toBe('danger');
    });
  });
});
