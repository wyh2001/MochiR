import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { withSkipErrorToast } from '../../../core/interceptors/error.interceptor';
import { isApiError } from '../../../core/utils/api-error';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  readonly form = this.fb.nonNullable.group({
    userName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly serverErrors = signal<string[]>([]);

  onSubmit(): void {
    if (this.form.invalid) return;

    this.serverError.set(null);
    this.serverErrors.set([]);
    this.submitting.set(true);

    this.authService.register(this.form.getRawValue(), withSkipErrorToast()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notifications.show(
          'success',
          'Registration successful. Please check your email to confirm your account.',
        );
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
          this.serverError.set('Something went wrong. Please try again.');
        }
      },
    });
  }
}
