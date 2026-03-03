import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminUserService } from '../../../../core/services/admin-user.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDirectoryResponseDto } from '../../../../api/models/user-directory-response-dto';
import { isApiError } from '../../../../core/utils/api-error';

@Component({
  selector: 'app-admin-user-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './user-detail.html',
})
export class AdminUserDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminUserService = inject(AdminUserService);
  private readonly notification = inject(NotificationService);

  readonly user = signal<UserDirectoryResponseDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly confirmingDelete = signal(false);
  readonly lockLoading = signal(false);

  private userId = '';

  ngOnInit(): void {
    this.userId = this.route.snapshot.params['id'];
    this.adminUserService.getById(this.userId).subscribe({
      next: (data) => {
        this.user.set(data);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        if (isApiError(err)) {
          this.error.set(err.message);
        }
      },
    });
  }

  onDelete(): void {
    this.confirmingDelete.set(true);
  }

  onCancelDelete(): void {
    this.confirmingDelete.set(false);
  }

  onConfirmDelete(): void {
    this.adminUserService.delete(this.userId).subscribe({
      next: () => {
        this.notification.show('success', 'User deleted successfully.');
        this.router.navigateByUrl('/admin/users');
      },
      error: (err: unknown) => {
        this.confirmingDelete.set(false);
        if (isApiError(err)) {
          this.error.set(err.message);
        }
      },
    });
  }

  onLock(): void {
    this.lockLoading.set(true);
    this.adminUserService.lock(this.userId, { until: '2099-12-31T23:59:59Z' }).subscribe({
      next: () => {
        this.lockLoading.set(false);
        this.notification.show('success', 'User locked.');
        this.reloadUser();
      },
      error: (err: unknown) => {
        this.lockLoading.set(false);
        if (isApiError(err)) {
          this.notification.show('danger', err.message);
        }
      },
    });
  }

  onUnlock(): void {
    this.lockLoading.set(true);
    this.adminUserService.lock(this.userId, { unlock: true }).subscribe({
      next: () => {
        this.lockLoading.set(false);
        this.notification.show('success', 'User unlocked.');
        this.reloadUser();
      },
      error: (err: unknown) => {
        this.lockLoading.set(false);
        if (isApiError(err)) {
          this.notification.show('danger', err.message);
        }
      },
    });
  }

  get isLocked(): boolean {
    const lockoutEnd = this.user()?.sensitive?.lockoutEnd;
    if (!lockoutEnd) return false;
    return new Date(lockoutEnd) > new Date();
  }

  private reloadUser(): void {
    this.adminUserService.getById(this.userId).subscribe({
      next: (data) => this.user.set(data),
    });
  }
}
