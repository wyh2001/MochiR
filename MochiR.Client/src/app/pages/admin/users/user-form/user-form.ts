import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AdminUserService } from '../../../../core/services/admin-user.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { isApiError } from '../../../../core/utils/api-error';

@Component({
  selector: 'app-admin-user-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './user-form.html',
})
export class AdminUserForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly adminUserService = inject(AdminUserService);
  private readonly notification = inject(NotificationService);

  readonly createForm = this.fb.nonNullable.group({
    userName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    displayName: [''],
    avatarUrl: [''],
    emailConfirmed: [false],
  });

  readonly editForm = this.fb.nonNullable.group({
    displayName: [''],
    avatarUrl: [''],
    email: [''],
    emailConfirmed: [false],
    phoneNumber: [''],
    phoneNumberConfirmed: [false],
    twoFactorEnabled: [false],
  });

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly isEditMode = signal(false);

  editId: string | null = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.params['id'];
    if (idParam) {
      this.editId = idParam;
      this.isEditMode.set(true);
      this.adminUserService.getById(this.editId!).subscribe({
        next: (response) => {
          this.editForm.patchValue({
            displayName: response.public.displayName ?? '',
            avatarUrl: response.public.avatarUrl ?? '',
            email: response.sensitive?.email ?? '',
            emailConfirmed: response.sensitive?.emailConfirmed ?? false,
            phoneNumber: response.sensitive?.phoneNumber ?? '',
            phoneNumberConfirmed: response.sensitive?.phoneNumberConfirmed ?? false,
            twoFactorEnabled: response.sensitive?.twoFactorEnabled ?? false,
          });
        },
        error: (err: unknown) => {
          if (isApiError(err)) {
            this.serverError.set(err.message);
          }
        },
      });
    }
  }

  onSubmit(): void {
    this.serverError.set(null);
    this.submitting.set(true);

    if (this.isEditMode()) {
      this.submitEdit();
    } else {
      this.submitCreate();
    }
  }

  private submitCreate(): void {
    if (this.createForm.invalid) {
      this.submitting.set(false);
      return;
    }

    const raw = this.createForm.getRawValue();
    this.adminUserService
      .create({
        userName: raw.userName,
        email: raw.email,
        password: raw.password,
        displayName: raw.displayName || undefined,
        avatarUrl: raw.avatarUrl || undefined,
        emailConfirmed: raw.emailConfirmed || undefined,
      })
      .subscribe({
        next: (response) => {
          this.submitting.set(false);
          this.notification.show('success', 'User created successfully.');
          this.router.navigateByUrl(`/admin/users/${response.public.id}`);
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          if (isApiError(err)) {
            this.serverError.set(err.message);
          }
        },
      });
  }

  private submitEdit(): void {
    const raw = this.editForm.getRawValue();
    this.adminUserService
      .update(this.editId!, {
        displayName: { value: raw.displayName || null, hasValue: true },
        avatarUrl: { value: raw.avatarUrl || null, hasValue: true },
        email: { value: raw.email || null, hasValue: true },
        emailConfirmed: { value: raw.emailConfirmed, hasValue: true },
        phoneNumber: { value: raw.phoneNumber || null, hasValue: true },
        phoneNumberConfirmed: { value: raw.phoneNumberConfirmed, hasValue: true },
        twoFactorEnabled: { value: raw.twoFactorEnabled, hasValue: true },
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.notification.show('success', 'User updated successfully.');
          this.router.navigateByUrl(`/admin/users/${this.editId}`);
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
