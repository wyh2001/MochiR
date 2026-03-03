import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { SubjectService } from '../../../../core/services/subject.service';
import { SubjectTypeService } from '../../../../core/services/subject-type.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { withSkipErrorToast } from '../../../../core/interceptors/error.interceptor';
import { SubjectTypeSummaryDto } from '../../../../api/models/subject-type-summary-dto';
import { AttributesEditor } from '../attributes-editor/attributes-editor';
import { isApiError } from '../../../../core/utils/api-error';

@Component({
  selector: 'app-subject-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AttributesEditor],
  templateUrl: './subject-form.html',
})
export class SubjectForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly subjectService = inject(SubjectService);
  private readonly subjectTypeService = inject(SubjectTypeService);
  private readonly notification = inject(NotificationService);

  readonly form = this.fb.nonNullable.group({
    subjectTypeId: [0, Validators.min(1)],
    name: ['', Validators.required],
    slug: ['', Validators.required],
  });

  readonly attributes: FormArray<FormGroup> = this.fb.array<FormGroup>([]);

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly subjectTypes = signal<SubjectTypeSummaryDto[]>([]);
  readonly isEditMode = signal(false);

  editId: number | null = null;

  ngOnInit(): void {
    this.subjectTypeService.getAll().subscribe({
      next: (data) => this.subjectTypes.set(data),
    });

    const idParam = this.route.snapshot.params['id'];
    if (idParam) {
      this.editId = Number(idParam);
      this.isEditMode.set(true);
      this.subjectService.getById(this.editId).subscribe({
        next: (detail) => {
          this.form.patchValue({
            subjectTypeId: detail.subjectTypeId,
            name: detail.name,
            slug: detail.slug,
          });
          for (const attr of detail.attributes) {
            this.attributes.push(
              this.fb.group({
                key: [attr.key, Validators.required],
                value: [attr.value ?? ''],
                note: [attr.note ?? ''],
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

  addAttribute(): void {
    this.attributes.push(
      this.fb.group({
        key: ['', Validators.required],
        value: [''],
        note: [''],
      }),
    );
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.serverError.set(null);
    this.submitting.set(true);

    const attributesValue = this.attributes.controls.map((g) => ({
      key: g.get('key')!.value as string,
      value: (g.get('value')!.value as string) || null,
      note: (g.get('note')!.value as string) || null,
    }));

    const payload = {
      subjectTypeId: this.form.getRawValue().subjectTypeId,
      name: this.form.getRawValue().name,
      slug: this.form.getRawValue().slug,
      attributes: attributesValue.length > 0 ? attributesValue : null,
    };

    const ctx = withSkipErrorToast();
    const request$ = this.isEditMode()
      ? this.subjectService.update(this.editId!, payload, ctx)
      : this.subjectService.create(payload, ctx);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        const action = this.isEditMode() ? 'updated' : 'created';
        this.notification.show('success', `Subject ${action} successfully.`);
        if (this.isEditMode()) {
          this.router.navigateByUrl(`/subjects/${this.editId}`);
        } else {
          this.router.navigateByUrl('/subjects');
        }
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        if (isApiError(err)) {
          this.serverError.set(err.message);
        } else {
          this.serverError.set('Something went wrong. Please try again.');
        }
      },
    });
  }
}
