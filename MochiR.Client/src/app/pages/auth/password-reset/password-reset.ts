import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './password-reset.html',
})
export class PasswordReset {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly submitting = signal(false);
  readonly submitted = signal(false);

  onSubmit(): void {
    if (this.form.invalid) return;

    this.submitting.set(true);

    this.authService.requestPasswordReset(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitted.set(true);
      },
      error: () => {
        this.submitting.set(false);
        this.submitted.set(true);
      },
    });
  }
}
