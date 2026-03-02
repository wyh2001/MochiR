import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { CriteriaTemplateDetail } from './criteria-template-detail';
import { apiResponseInterceptor } from '../../../../core/interceptors/api-response.interceptor';

describe('CriteriaTemplateDetail', () => {
  let fixture: ComponentFixture<CriteriaTemplateDetail>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CriteriaTemplateDetail],
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

    fixture = TestBed.createComponent(CriteriaTemplateDetail);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const mockDetail = {
    id: 1,
    subjectTypeId: 1,
    subjectTypeKey: 'movie',
    subjectTypeDisplayName: 'Movie',
    key: 'acting',
    displayName: 'Acting Quality',
    isRequired: true,
  };

  function flushDetail(data: unknown = mockDetail) {
    http.expectOne('/api/criteria-templates/1').flush({
      success: true,
      data,
      error: null,
      traceId: '',
      timestampUtc: '',
    });
    fixture.detectChanges();
  }

  it('fetches template by id and displays all fields', () => {
    fixture.detectChanges();
    flushDetail();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('acting');
    expect(el.textContent).toContain('Acting Quality');
  });

  it('shows subject type key and display name', () => {
    fixture.detectChanges();
    flushDetail();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('movie');
    expect(el.textContent).toContain('Movie');
  });

  it('shows Required badge', () => {
    fixture.detectChanges();
    flushDetail();

    const badge = fixture.nativeElement.querySelector('.badge.bg-success');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain('Required');
  });

  it('Back to list link navigates to /criteria-templates', () => {
    fixture.detectChanges();
    flushDetail();

    const link = fixture.nativeElement.querySelector('a[href="/criteria-templates"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Back');
  });

  it('shows error message when template not found', () => {
    fixture.detectChanges();

    http.expectOne('/api/criteria-templates/1').flush({
      success: false,
      data: null,
      error: {
        code: 'CRITERIA_TEMPLATE_NOT_FOUND',
        message: 'Criteria template not found',
        details: null,
      },
      traceId: '',
      timestampUtc: '',
    });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Criteria template not found');
    const alert = fixture.nativeElement.querySelector('.alert-danger');
    expect(alert).toBeTruthy();
  });

  it('shows loading state while fetching', () => {
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Loading');

    flushDetail();
  });
});
