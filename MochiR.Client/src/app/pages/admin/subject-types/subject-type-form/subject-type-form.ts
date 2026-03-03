import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { SubjectTypeService } from '../../../../core/services/subject-type.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { withSkipErrorToast } from '../../../../core/interceptors/error.interceptor';
import { SettingsEditor } from '../settings-editor/settings-editor';
import { isApiError } from '../../../../core/utils/api-error';

@Component({
  selector: 'app-subject-type-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SettingsEditor],
  templateUrl: './subject-type-form.html',
})
export class SubjectTypeForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly subjectTypeService = inject(SubjectTypeService);
  private readonly notification = inject(NotificationService);

  readonly form = this.fb.nonNullable.group({
    key: ['', Validators.required],
    displayName: ['', Validators.required],
  });

  readonly settings: FormArray<FormGroup> = this.fb.array<FormGroup>([]);

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly isEditMode = signal(false);

  private editId: number | null = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.params['id'];
    if (idParam) {
      this.editId = Number(idParam);
      this.isEditMode.set(true);

      const state = history.state as Record<string, string> | undefined;
      if (state?.['key'] && state?.['displayName']) {
        this.form.patchValue({
          key: state['key'],
          displayName: state['displayName'],
        });
      }
    }
  }

  addSetting(): void {
    this.settings.push(
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

    const settingsValue = this.settings.controls.map((g) => ({
      key: g.get('key')!.value as string,
      value: (g.get('value')!.value as string) || null,
      note: (g.get('note')!.value as string) || null,
    }));

    const payload = {
      key: this.form.getRawValue().key,
      displayName: this.form.getRawValue().displayName,
      settings: settingsValue,
    };

    const ctx = withSkipErrorToast();
    const request$ = this.isEditMode()
      ? this.subjectTypeService.update(this.editId!, payload, ctx)
      : this.subjectTypeService.create(payload, ctx);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        const action = this.isEditMode() ? 'updated' : 'created';
        this.notification.show('success', `Subject type ${action} successfully.`);
        this.router.navigateByUrl('/subject-types');
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
