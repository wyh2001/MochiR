import { Component, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { NotificationService } from '../../../core/services/notification.service';
import { isApiError } from '../../../core/utils/api-error';

@Component({
  selector: 'app-email-confirm',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './email-confirm.html',
})
export class EmailConfirm {
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  constructor() {
    this.route.queryParams.subscribe((params) => {
      const email = params['email'] ?? '';
      const token = params['token'] ?? '';

      if (!email || !token) {
        this.error.set('Missing email or token parameters.');
        return;
      }

      this.submitting.set(true);
      this.profileService.confirmEmailChange({ email, token }).subscribe({
        next: () => {
          this.submitting.set(false);
          this.success.set(true);
          this.notifications.show('success', 'Email updated successfully.');
          this.router.navigateByUrl('/profile');
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          if (isApiError(err)) {
            this.error.set(err.message);
          } else {
            this.error.set('Failed to confirm email change.');
          }
        },
      });
    });
  }
}
