import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CriteriaTemplateService } from '../../../../core/services/criteria-template.service';
import { SubjectTypeService } from '../../../../core/services/subject-type.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SubjectTypeSummaryDto } from '../../../../api/models/subject-type-summary-dto';

interface ApiError {
  code: string;
  message: string;
  details: Record<string, string[]> | null;
}

function isApiError(err: unknown): err is ApiError {
  return err !== null && typeof err === 'object' && 'code' in err && 'message' in err;
}

@Component({
  selector: 'app-criteria-template-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './criteria-template-form.html',
})
export class CriteriaTemplateForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly criteriaTemplateService = inject(CriteriaTemplateService);
  private readonly subjectTypeService = inject(SubjectTypeService);
  private readonly notification = inject(NotificationService);

  readonly form = this.fb.nonNullable.group({
    subjectTypeId: [0, Validators.min(1)],
    key: ['', Validators.required],
    displayName: ['', Validators.required],
    isRequired: [false],
  });

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly subjectTypes = signal<SubjectTypeSummaryDto[]>([]);

  ngOnInit(): void {
    this.subjectTypeService.getAll().subscribe({
      next: (data) => this.subjectTypes.set(data),
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.serverError.set(null);
    this.submitting.set(true);

    const payload = {
      subjectTypeId: this.form.getRawValue().subjectTypeId,
      key: this.form.getRawValue().key,
      displayName: this.form.getRawValue().displayName,
      isRequired: this.form.getRawValue().isRequired,
    };

    this.criteriaTemplateService.create(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notification.show('success', 'Criteria template created successfully.');
        this.router.navigateByUrl('/criteria-templates');
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
