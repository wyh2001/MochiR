import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SetupService } from '../../../core/services/setup.service';
import { NotificationService } from '../../../core/services/notification.service';
import { isApiError } from '../../../core/utils/api-error';

@Component({
  selector: 'app-admin-setup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './admin-setup.html',
})
export class AdminSetup implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly setupService = inject(SetupService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  readonly form = this.fb.nonNullable.group({
    setupKey: ['', Validators.required],
    userName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    confirmPassword: ['', Validators.required],
  });

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly serverErrors = signal<string[]>([]);
  readonly success = signal(false);

  ngOnInit(): void {
    this.setupService.getStatus().subscribe({
      next: (status) => {
        this.loading.set(false);
        if (!status.needsSetup) {
          this.router.navigateByUrl('/');
        }
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const { setupKey, userName, email, password, confirmPassword } = this.form.getRawValue();
    if (password !== confirmPassword) {
      this.serverError.set('Passwords do not match.');
      return;
    }

    this.serverError.set(null);
    this.serverErrors.set([]);
    this.submitting.set(true);

    this.setupService.createInitialAdmin({ userName, email, password }, setupKey).subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set(true);
        this.notifications.show('success', 'Admin account created. You can now log in.');
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        if (isApiError(err)) {
          this.serverError.set(err.message);
          if (err.details) {
            this.serverErrors.set(Object.values(err.details).flat() as string[]);
          }
        } else {
          this.serverError.set('Failed to create initial admin.');
        }
      },
    });
  }
}
