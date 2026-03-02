import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ReviewService } from '../../../core/services/review.service';
import { SubjectService } from '../../../core/services/subject.service';
import { CriteriaTemplateService } from '../../../core/services/criteria-template.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SubjectSummaryDto } from '../../../api/models/subject-summary-dto';
import { RatingsEditor } from '../ratings-editor/ratings-editor';

interface ApiError {
  code: string;
  message: string;
  details: Record<string, string[]> | null;
}

function isApiError(err: unknown): err is ApiError {
  return err !== null && typeof err === 'object' && 'code' in err && 'message' in err;
}

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, RatingsEditor],
  templateUrl: './review-form.html',
})
export class ReviewForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly reviewService = inject(ReviewService);
  private readonly subjectService = inject(SubjectService);
  private readonly criteriaTemplateService = inject(CriteriaTemplateService);
  private readonly notification = inject(NotificationService);

  readonly form = this.fb.nonNullable.group({
    subjectId: [0, Validators.min(1)],
    title: [''],
    content: [''],
    excerpt: [''],
  });

  readonly ratings: FormArray<FormGroup> = this.fb.array<FormGroup>([]);
  readonly tagsInput = signal('');

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly subjects = signal<SubjectSummaryDto[]>([]);
  readonly isEditMode = signal(false);
  readonly editSubjectName = signal<string | null>(null);

  editId: number | null = null;

  ngOnInit(): void {
    this.subjectService.getAll().subscribe({
      next: (data) => this.subjects.set(data),
    });

    const idParam = this.route.snapshot.params['id'];
    if (!idParam) {
      this.form.get('subjectId')!.valueChanges.subscribe((subjectId) => {
        this.loadCriteriaTemplates(Number(subjectId));
      });
    }

    if (idParam) {
      this.editId = Number(idParam);
      this.isEditMode.set(true);
      this.form.get('title')!.addValidators(Validators.required);
      this.form.get('title')!.updateValueAndValidity();
      this.reviewService.getById(this.editId).subscribe({
        next: (detail) => {
          this.form.patchValue({
            subjectId: detail.subjectId,
            title: detail.title ?? '',
            content: detail.content ?? '',
            excerpt: detail.excerpt ?? '',
          });
          this.editSubjectName.set(detail.subjectName);
          this.tagsInput.set(detail.tags.join(', '));
          for (const r of detail.ratings) {
            this.ratings.push(
              this.fb.group({
                key: [{ value: r.key, disabled: true }, Validators.required],
                label: [{ value: r.label ?? '', disabled: true }],
                score: [r.score, [Validators.required, Validators.min(0), Validators.max(5)]],
              }),
            );
          }
        },
        error: (err: unknown) => {
          if (isApiError(err)) {
            this.serverError.set(err.message);
          }
        },
      });
    }
  }

  private loadCriteriaTemplates(subjectId: number): void {
    const subject = this.subjects().find((s) => s.id === subjectId);
    if (!subject) return;

    this.criteriaTemplateService.getAll(subject.subjectTypeId).subscribe({
      next: (templates) => {
        this.ratings.clear();
        for (const t of templates) {
          const group = this.fb.group({
            key: [{ value: t.key, disabled: true }, Validators.required],
            label: [{ value: t.displayName, disabled: true }],
            score: [0, [Validators.required, Validators.min(0), Validators.max(5)]],
          });
          this.ratings.push(group);
        }
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.serverError.set(null);
    this.submitting.set(true);

    const ratingsValue = this.ratings.controls.map((g) => ({
      key: g.get('key')!.value as string,
      label: (g.get('label')!.value as string) || null,
      score: g.get('score')!.value as number,
    }));

    const tags = this.tagsInput()
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (this.isEditMode()) {
      const payload = {
        title: this.form.getRawValue().title,
        content: this.form.getRawValue().content || null,
        excerpt: this.form.getRawValue().excerpt || null,
        ratings: ratingsValue.length > 0 ? ratingsValue : null,
        tags: tags.length > 0 ? tags : null,
      };

      this.reviewService.update(this.editId!, payload).subscribe({
        next: () => {
          this.submitting.set(false);
          this.notification.show('success', 'Review updated successfully.');
          this.router.navigateByUrl(`/reviews/${this.editId}`);
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          if (isApiError(err)) {
            this.serverError.set(err.message);
          }
        },
      });
    } else {
      const payload = {
        subjectId: this.form.getRawValue().subjectId,
        title: this.form.getRawValue().title || null,
        content: this.form.getRawValue().content || null,
        excerpt: this.form.getRawValue().excerpt || null,
        ratings: ratingsValue.length > 0 ? ratingsValue : null,
        tags: tags.length > 0 ? tags : null,
      };

      this.reviewService.create(payload).subscribe({
        next: (result) => {
          this.submitting.set(false);
          this.notification.show('success', 'Review created successfully.');
          this.router.navigateByUrl(`/reviews/${result.id}`);
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          if (isApiError(err)) {
            this.serverError.set(err.message);
          }
        },
      });
    }
  }
}
