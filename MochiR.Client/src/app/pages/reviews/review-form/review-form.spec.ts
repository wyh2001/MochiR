import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ReviewForm } from './review-form';
import { apiResponseInterceptor } from '../../../core/interceptors/api-response.interceptor';
import { NotificationService } from '../../../core/services/notification.service';

describe('ReviewForm', () => {
  const envelope = (data: unknown) => ({
    success: true,
    data,
    error: null,
    traceId: '',
    timestampUtc: '',
  });

  const mockSubjects = [
    { id: 1, name: 'Inception', slug: 'inception', subjectTypeId: 1 },
    { id: 2, name: 'Dune', slug: 'dune', subjectTypeId: 2 },
  ];

  const mockCriteriaTemplates = [
    { id: 1, subjectTypeId: 1, key: 'acting', displayName: 'Acting', isRequired: true },
    { id: 2, subjectTypeId: 1, key: 'plot', displayName: 'Plot', isRequired: false },
  ];

  const mockSummary = {
    id: 1,
    subjectId: 1,
    subjectName: 'Inception',
    userId: 'john',
    authorUserName: 'john',
    authorDisplayName: 'John Doe',
    authorAvatarUrl: null,
    title: 'Great movie',
    content: 'Full content',
    excerpt: null,
    excerptIsAuto: false,
    ratings: [],
    status: 1,
    tags: [],
    likeCount: 0,
    isLikedByCurrentUser: false,
    createdAt: '2026-01-15T10:30:00Z',
  };

  describe('create mode', () => {
    let fixture: ComponentFixture<ReviewForm>;
    let http: HttpTestingController;
    let notification: NotificationService;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [ReviewForm],
        providers: [
          provideRouter([{ path: '**', children: [] }]),
          provideHttpClient(withInterceptors([apiResponseInterceptor])),
          provideHttpClientTesting(),
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: { params: {} },
              params: of({}),
            },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(ReviewForm);
      http = TestBed.inject(HttpTestingController);
      notification = TestBed.inject(NotificationService);
      fixture.detectChanges();

      // Flush subjects request
      http.expectOne('/api/subjects').flush(envelope(mockSubjects));
      fixture.detectChanges();
    });

    afterEach(() => http.verify());

    function selectSubject(subjectId: number, templates: unknown[] = mockCriteriaTemplates) {
      const component = fixture.componentInstance;
      component.form.patchValue({ subjectId });
      const subject = mockSubjects.find((s) => s.id === subjectId);
      if (subject) {
        http
          .expectOne(`/api/criteria-templates?subjectTypeId=${subject.subjectTypeId}`)
          .flush(envelope(templates));
        fixture.detectChanges();
      }
    }

    it('renders form fields', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('select[formControlName="subjectId"]')).toBeTruthy();
      expect(el.querySelector('input[formControlName="title"]')).toBeTruthy();
      expect(el.querySelector('textarea[formControlName="content"]')).toBeTruthy();
    });

    it('populates subject dropdown', () => {
      const options = fixture.nativeElement.querySelectorAll(
        'select[formControlName="subjectId"] option',
      );
      // placeholder + 2 subjects
      expect(options.length).toBe(3);
      expect(options[1].textContent).toContain('Inception');
      expect(options[2].textContent).toContain('Dune');
    });

    it('shows validation error when subjectId is not selected', () => {
      const component = fixture.componentInstance;
      expect(component.form.get('subjectId')!.valid).toBe(false);
    });

    it('loads criteria templates when subject is selected', () => {
      selectSubject(1);

      const component = fixture.componentInstance;
      expect(component.ratings.length).toBe(2);
      expect(component.ratings.at(0).get('key')!.value).toBe('acting');
      expect(component.ratings.at(0).get('label')!.value).toBe('Acting');
      expect(component.ratings.at(1).get('key')!.value).toBe('plot');
      expect(component.ratings.at(1).get('label')!.value).toBe('Plot');
    });

    it('disables key and label for template-loaded ratings', () => {
      selectSubject(1);

      const component = fixture.componentInstance;
      expect(component.ratings.at(0).get('key')!.disabled).toBe(true);
      expect(component.ratings.at(0).get('label')!.disabled).toBe(true);
      expect(component.ratings.at(0).get('score')!.disabled).toBe(false);
    });

    it('does not show Remove button for template-loaded ratings', () => {
      selectSubject(1);

      const removeButtons = fixture.nativeElement.querySelectorAll('.btn-remove-rating');
      expect(removeButtons.length).toBe(0);
    });

    it('clears previous ratings when subject changes', () => {
      selectSubject(1);
      expect(fixture.componentInstance.ratings.length).toBe(2);

      selectSubject(2, [
        { id: 3, subjectTypeId: 2, key: 'writing', displayName: 'Writing', isRequired: true },
      ]);
      expect(fixture.componentInstance.ratings.length).toBe(1);
      expect(fixture.componentInstance.ratings.at(0).get('key')!.value).toBe('writing');
    });

    it('adds and removes manual ratings via DOM click', () => {
      const addBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-add-rating');
      addBtn.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.ratings.length).toBe(1);

      const removeBtn: HTMLButtonElement =
        fixture.nativeElement.querySelector('.btn-remove-rating');
      removeBtn.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.ratings.length).toBe(0);
    });

    it('sends POST with correct payload including template ratings and tags', () => {
      selectSubject(1);

      const component = fixture.componentInstance;
      component.form.patchValue({ title: 'Great movie', content: 'Full content', excerpt: '' });
      component.tagsInput.set('sci-fi, thriller');

      // Set scores for template ratings
      component.ratings.at(0).patchValue({ score: 4 });
      component.ratings.at(1).patchValue({ score: 3 });

      component.onSubmit();

      const req = http.expectOne('/api/reviews');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.subjectId).toBe(1);
      expect(req.request.body.title).toBe('Great movie');
      expect(req.request.body.ratings).toEqual([
        { key: 'acting', label: 'Acting', score: 4 },
        { key: 'plot', label: 'Plot', score: 3 },
      ]);
      expect(req.request.body.tags).toEqual(['sci-fi', 'thriller']);
      req.flush(envelope({ ...mockSummary, id: 5 }));
    });

    it('shows success notification after create', () => {
      selectSubject(1);

      const component = fixture.componentInstance;
      component.form.patchValue({ title: 'Test', content: '', excerpt: '' });
      component.ratings.at(0).patchValue({ score: 3 });
      component.ratings.at(1).patchValue({ score: 3 });
      component.onSubmit();

      http.expectOne('/api/reviews').flush(envelope({ ...mockSummary, id: 5 }));

      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].type).toBe('success');
      expect(notification.notifications()[0].message).toContain('created');
    });

    it('disables submit button during submission', () => {
      selectSubject(1);

      const component = fixture.componentInstance;
      component.form.patchValue({ title: 'Test', content: '', excerpt: '' });
      component.ratings.at(0).patchValue({ score: 3 });
      component.ratings.at(1).patchValue({ score: 3 });
      component.onSubmit();

      expect(component.submitting()).toBe(true);

      http.expectOne('/api/reviews').flush(envelope(mockSummary));
    });

    it('shows server error', () => {
      const component = fixture.componentInstance;
      // subjectId 999 not in subjects list, no criteria templates request
      component.form.patchValue({ subjectId: 999, title: 'Test', content: '', excerpt: '' });
      component.onSubmit();

      http.expectOne('/api/reviews').flush({
        success: false,
        data: null,
        error: {
          code: 'REVIEW_SUBJECT_NOT_FOUND',
          message: 'Subject not found',
          details: null,
        },
        traceId: '',
        timestampUtc: '',
      });
      fixture.detectChanges();

      expect(component.serverError()).toBe('Subject not found');
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Subject not found');
    });

    it('shows Cancel link to reviews list', () => {
      const cancelLink = fixture.nativeElement.querySelector('a[href="/reviews"]');
      expect(cancelLink).toBeTruthy();
      expect(cancelLink.textContent).toContain('Cancel');
    });

    it('shows Create heading', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Create Review');
    });
  });

  describe('edit mode', () => {
    let fixture: ComponentFixture<ReviewForm>;
    let http: HttpTestingController;
    let notification: NotificationService;

    const mockDetail = {
      id: 1,
      subjectId: 1,
      subjectName: 'Inception',
      subjectSlug: 'inception',
      userId: 'john',
      authorUserName: 'john',
      authorDisplayName: 'John Doe',
      authorAvatarUrl: null,
      title: 'Great movie',
      content: 'Full review content',
      excerpt: 'Great movie...',
      excerptIsAuto: false,
      tags: ['sci-fi', 'thriller'],
      ratings: [{ key: 'story', label: 'Story', score: 9 }],
      likeCount: 5,
      isLikedByCurrentUser: false,
      status: 1,
      createdAt: '2026-01-15T10:30:00Z',
      updatedAt: '2026-01-16T12:00:00Z',
      media: [],
    };

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [ReviewForm],
        providers: [
          provideRouter([{ path: '**', children: [] }]),
          provideHttpClient(withInterceptors([apiResponseInterceptor])),
          provideHttpClientTesting(),
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: { params: { id: '1' } },
              params: of({ id: '1' }),
            },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(ReviewForm);
      http = TestBed.inject(HttpTestingController);
      notification = TestBed.inject(NotificationService);
      fixture.detectChanges();

      // Flush subjects + detail requests
      http.expectOne('/api/subjects').flush(envelope(mockSubjects));
      http.expectOne('/api/reviews/1').flush(envelope(mockDetail));
      fixture.detectChanges();
    });

    afterEach(() => http.verify());

    it('detects edit mode', () => {
      expect(fixture.componentInstance.isEditMode()).toBe(true);
    });

    it('pre-fills form with existing data', () => {
      const component = fixture.componentInstance;
      expect(component.form.getRawValue().title).toBe('Great movie');
      expect(component.form.getRawValue().content).toBe('Full review content');
      expect(component.form.getRawValue().excerpt).toBe('Great movie...');
    });

    it('pre-fills ratings with disabled key and label', () => {
      const component = fixture.componentInstance;
      expect(component.ratings.length).toBe(1);
      expect(component.ratings.at(0).get('key')!.value).toBe('story');
      expect(component.ratings.at(0).get('key')!.disabled).toBe(true);
      expect(component.ratings.at(0).get('label')!.disabled).toBe(true);
      expect(component.ratings.at(0).get('score')!.value).toBe(9);
    });

    it('pre-fills tags', () => {
      expect(fixture.componentInstance.tagsInput()).toBe('sci-fi, thriller');
    });

    it('shows subject as read-only text', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Inception');
      expect(el.querySelector('select[formControlName="subjectId"]')).toBeFalsy();
    });

    it('sends PUT request with updated payload', () => {
      const component = fixture.componentInstance;
      component.form.patchValue({ title: 'Updated title' });
      component.onSubmit();

      const req = http.expectOne('/api/reviews/1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.title).toBe('Updated title');
      req.flush(envelope(mockSummary));
    });

    it('shows success notification with updated message', () => {
      const component = fixture.componentInstance;
      component.onSubmit();

      http.expectOne('/api/reviews/1').flush(envelope(mockSummary));

      expect(notification.notifications().length).toBe(1);
      expect(notification.notifications()[0].message).toContain('updated');
    });

    it('shows Edit heading', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Edit Review');
    });

    it('Cancel links to detail page', () => {
      const cancelLink = fixture.nativeElement.querySelector('a[href="/reviews/1"]');
      expect(cancelLink).toBeTruthy();
    });

    it('requires title in edit mode', () => {
      const component = fixture.componentInstance;
      component.form.patchValue({ title: '' });
      expect(component.form.get('title')!.valid).toBe(false);
    });

    it('shows server error on edit failure', () => {
      const component = fixture.componentInstance;
      component.onSubmit();

      http.expectOne('/api/reviews/1').flush({
        success: false,
        data: null,
        error: { code: 'UPDATE_FAILED', message: 'Update failed', details: null },
        traceId: '',
        timestampUtc: '',
      });
      fixture.detectChanges();

      expect(component.serverError()).toBe('Update failed');
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Update failed');
    });
  });
});
