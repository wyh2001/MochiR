import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminUserList } from './user-list';
import { apiResponseInterceptor } from '../../../../core/interceptors/api-response.interceptor';
import { NotificationService } from '../../../../core/services/notification.service';

describe('AdminUserList', () => {
  let fixture: ComponentFixture<AdminUserList>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminUserList],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    fixture = TestBed.createComponent(AdminUserList);
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

  const mockPage = {
    totalCount: 2,
    page: 1,
    pageSize: 50,
    items: [
      {
        id: 'user-1',
        userName: 'alice',
        displayName: 'Alice',
        avatarUrl: null,
        createdAtUtc: '2026-01-15T12:00:00Z',
      },
      {
        id: 'user-2',
        userName: 'bob',
        displayName: 'Bob',
        avatarUrl: null,
        createdAtUtc: '2026-01-20T12:00:00Z',
      },
    ],
  };

  function flushList(data: unknown = mockPage) {
    http.expectOne((req) => req.url === '/api/users').flush(envelope(data));
    fixture.detectChanges();
  }

  it('renders a table with users', () => {
    fixture.detectChanges();
    flushList();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('alice');
    expect(rows[0].textContent).toContain('Alice');
    expect(rows[1].textContent).toContain('bob');
  });

  it('shows empty state when no users exist', () => {
    fixture.detectChanges();
    flushList({ totalCount: 0, page: 1, pageSize: 50, items: [] });

    expect(fixture.nativeElement.textContent).toContain('No users found');
  });

  it('shows loading state', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading');

    flushList();
  });

  it('shows total count', () => {
    fixture.detectChanges();
    flushList();

    expect(fixture.nativeElement.textContent).toContain('2 users total');
  });

  it('shows View, Edit, and Delete buttons per row', () => {
    fixture.detectChanges();
    flushList();

    const row = fixture.nativeElement.querySelector('tbody tr');
    expect(row.textContent).toContain('View');
    expect(row.textContent).toContain('Edit');
    expect(row.textContent).toContain('Delete');
  });

  it('shows Create User button', () => {
    fixture.detectChanges();
    flushList();

    const link = fixture.nativeElement.querySelector('a[href="/admin/users/new"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Create User');
  });

  it('shows inline confirmation when Delete is clicked', () => {
    fixture.detectChanges();
    flushList();

    const deleteBtn = fixture.nativeElement.querySelector('.btn-outline-danger');
    deleteBtn.click();
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('tbody tr');
    expect(row.textContent).toContain('Are you sure?');
    expect(row.textContent).toContain('Confirm');
    expect(row.textContent).toContain('Cancel');
  });

  it('hides confirmation when Cancel is clicked', () => {
    fixture.detectChanges();
    flushList();

    const deleteBtn = fixture.nativeElement.querySelector('.btn-outline-danger');
    deleteBtn.click();
    fixture.detectChanges();

    const cancelBtn = fixture.nativeElement.querySelector('.btn-secondary');
    cancelBtn.click();
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('tbody tr');
    expect(row.textContent).not.toContain('Are you sure?');
  });

  it('calls DELETE API on confirm and shows notification', () => {
    fixture.detectChanges();
    flushList();

    const deleteBtn = fixture.nativeElement.querySelector('.btn-outline-danger');
    deleteBtn.click();
    fixture.detectChanges();

    const confirmBtn = fixture.nativeElement.querySelector('.btn-confirm-delete');
    confirmBtn.click();

    const req = http.expectOne('/api/users/user-1');
    expect(req.request.method).toBe('DELETE');
    req.flush(envelope({ userId: 'user-1', isDeleted: true }));

    // Reloads list after delete
    flushList({
      totalCount: 1,
      page: 1,
      pageSize: 50,
      items: [mockPage.items[1]],
    });

    const notification = TestBed.inject(NotificationService);
    expect(notification.notifications().length).toBe(1);
    expect(notification.notifications()[0].type).toBe('success');
  });

  it('searches users on Enter key', () => {
    fixture.detectChanges();
    flushList();

    fixture.componentInstance.searchQuery.set('alice');
    fixture.componentInstance.onSearch();

    const req = http.expectOne('/api/users?query=alice&page=1&pageSize=50');
    expect(req.request.method).toBe('GET');
    req.flush(
      envelope({
        totalCount: 1,
        page: 1,
        pageSize: 50,
        items: [mockPage.items[0]],
      }),
    );
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
  });
});
