import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { withSkipErrorToast } from '../../../core/interceptors/error.interceptor';
import { isApiError } from '../../../core/utils/api-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    userNameOrEmail: ['', Validators.required],
    password: ['', Validators.required],
  });

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);

  onSubmit(): void {
    if (this.form.invalid) return;

    this.serverError.set(null);
    this.submitting.set(true);

    this.authService.login(this.form.getRawValue(), withSkipErrorToast()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl('/');
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
