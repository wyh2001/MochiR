import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

interface ApiError {
  code: string;
  message: string;
  details: Record<string, string[]> | null;
}

function isApiError(err: unknown): err is ApiError {
  return err !== null && typeof err === 'object' && 'code' in err && 'message' in err;
}

@Component({
  selector: 'app-password-reset-confirm',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './password-reset-confirm.html',
})
export class PasswordResetConfirm {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);

  readonly form = this.fb.nonNullable.group({
    newPassword: ['', Validators.required],
  });

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly serverErrors = signal<string[]>([]);

  email = '';
  token = '';

  constructor() {
    this.route.queryParams.subscribe((params) => {
      this.email = params['email'] ?? '';
      this.token = params['token'] ?? '';
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.serverError.set(null);
    this.serverErrors.set([]);
    this.submitting.set(true);

    this.authService
      .confirmPasswordReset({
        email: this.email,
        token: this.token,
        newPassword: this.form.getRawValue().newPassword,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.notifications.show('success', 'Password has been reset successfully.');
          this.router.navigateByUrl('/login');
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          if (isApiError(err)) {
            this.serverError.set(err.message);
            if (err.details) {
              this.serverErrors.set(Object.values(err.details).flat());
            }
          }
        },
      });
  }
}
