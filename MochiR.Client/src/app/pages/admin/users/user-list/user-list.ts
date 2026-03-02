import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminUserService } from '../../../../core/services/admin-user.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { DirectoryUserDto } from '../../../../api/models/directory-user-dto';
import { isApiError } from '../../../../core/utils/api-error';

@Component({
  selector: 'app-admin-user-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './user-list.html',
})
export class AdminUserList implements OnInit {
  private readonly adminUserService = inject(AdminUserService);
  private readonly notification = inject(NotificationService);

  readonly users = signal<DirectoryUserDto[]>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(true);
  readonly deletingId = signal<string | null>(null);
  readonly searchQuery = signal('');

  private page = 1;
  private readonly pageSize = 50;

  ngOnInit(): void {
    this.loadList();
  }

  onSearch(): void {
    this.page = 1;
    this.loadList();
  }

  confirmDelete(id: string): void {
    this.adminUserService.delete(id).subscribe({
      next: () => {
        this.notification.show('success', 'User deleted successfully.');
        this.deletingId.set(null);
        this.loadList();
      },
      error: (err: unknown) => {
        if (isApiError(err)) {
          this.notification.show('danger', err.message);
        }
        this.deletingId.set(null);
      },
    });
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  private loadList(): void {
    this.loading.set(true);
    this.adminUserService
      .getAll({
        query: this.searchQuery() || undefined,
        page: this.page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (data) => {
          this.users.set(data?.items ?? []);
          this.totalCount.set(data?.totalCount ?? 0);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }
}
