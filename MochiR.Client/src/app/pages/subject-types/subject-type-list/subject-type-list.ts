import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SubjectTypeService } from '../../../core/services/subject-type.service';
import { SubjectTypeSummaryDto } from '../../../api/models/subject-type-summary-dto';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { isApiError } from '../../../core/utils/api-error';

@Component({
  selector: 'app-subject-type-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './subject-type-list.html',
})
export class SubjectTypeList implements OnInit {
  private readonly subjectTypeService = inject(SubjectTypeService);
  private readonly notification = inject(NotificationService);
  private readonly authState = inject(AuthStateService);

  readonly isAdmin = this.authState.isAdmin;
  readonly subjectTypes = signal<SubjectTypeSummaryDto[]>([]);
  readonly loading = signal(true);
  readonly deletingId = signal<number | null>(null);

  ngOnInit(): void {
    this.loadList();
  }

  confirmDelete(id: number): void {
    this.subjectTypeService.delete(id).subscribe({
      next: () => {
        this.notification.show('success', 'Subject type deleted successfully.');
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
    this.subjectTypeService.getAll().subscribe({
      next: (data) => {
        this.subjectTypes.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}
