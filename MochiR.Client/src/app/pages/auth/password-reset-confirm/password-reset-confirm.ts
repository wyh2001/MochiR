import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { withSkipErrorToast } from '../../../core/interceptors/error.interceptor';
import { isApiError } from '../../../core/utils/api-error';

@Component({
  selector: 'app-password-reset-confirm',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './password-reset-confirm.html',
})
export class PasswordResetConfirm implements OnInit {
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

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    this.email = params['email'] ?? '';
    this.token = params['token'] ?? '';
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.serverError.set(null);
    this.serverErrors.set([]);
    this.submitting.set(true);

    this.authService
      .confirmPasswordReset(
        {
          email: this.email,
          token: this.token,
          newPassword: this.form.getRawValue().newPassword,
        },
        withSkipErrorToast(),
      )
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
          } else {
            this.serverError.set('Failed to reset password. Please try again.');
          }
        },
      });
  }
}
