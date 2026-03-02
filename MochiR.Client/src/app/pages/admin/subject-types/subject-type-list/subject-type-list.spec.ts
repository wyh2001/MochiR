import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SubjectTypeList } from './subject-type-list';
import { apiResponseInterceptor } from '../../../../core/interceptors/api-response.interceptor';
import { NotificationService } from '../../../../core/services/notification.service';

describe('SubjectTypeList', () => {
  let fixture: ComponentFixture<SubjectTypeList>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectTypeList],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubjectTypeList);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function flushList(data: unknown[]) {
    http.expectOne('/api/subject-types').flush({
      success: true,
      data,
      error: null,
      traceId: '',
      timestampUtc: '',
    });
    fixture.detectChanges();
  }

  it('renders a table with subject types', () => {
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
    fixture.detectChanges();
    flushList([]);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No subject types found');
  });

  it('shows Create button linking to new form', () => {
    fixture.detectChanges();
    flushList([]);

    const link = fixture.nativeElement.querySelector('a[href="/admin/subject-types/new"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Create');
  });

  it('shows Edit and Delete buttons per row', () => {
    fixture.detectChanges();
    flushList([{ id: 1, key: 'movie', displayName: 'Movie' }]);

    const row = fixture.nativeElement.querySelector('tbody tr');
    expect(row.textContent).toContain('Edit');
    expect(row.textContent).toContain('Delete');
  });

  it('shows loading state while fetching', () => {
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Loading');

    flushList([]);
  });

  describe('delete', () => {
    function setupWithData() {
      fixture.detectChanges();
      flushList([
        { id: 1, key: 'movie', displayName: 'Movie' },
        { id: 2, key: 'book', displayName: 'Book' },
      ]);
    }

    it('shows inline confirmation when Delete is clicked', () => {
      setupWithData();

      const deleteBtn = fixture.nativeElement.querySelector('.btn-outline-danger');
      deleteBtn.click();
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('tbody tr');
      expect(row.textContent).toContain('Are you sure?');
      expect(row.textContent).toContain('Confirm');
      expect(row.textContent).toContain('Cancel');
    });

    it('hides confirmation when Cancel is clicked', () => {
      setupWithData();

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
      setupWithData();

      const deleteBtn = fixture.nativeElement.querySelector('.btn-outline-danger');
      deleteBtn.click();
      fixture.detectChanges();

      const confirmBtn = fixture.nativeElement.querySelector('.btn-danger');
      confirmBtn.click();

      const req = http.expectOne('/api/subject-types/1');
      expect(req.request.method).toBe('DELETE');
      req.flush({
        success: true,
        data: { id: 1, deleted: true },
        error: null,
        traceId: '',
        timestampUtc: '',
      });

      // After delete, list is reloaded
      flushList([{ id: 2, key: 'book', displayName: 'Book' }]);

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('book');
    });

    it('shows error notification on delete failure', () => {
      setupWithData();

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
