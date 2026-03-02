import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SubjectService } from '../../../../core/services/subject.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SubjectDetailDto } from '../../../../api/models/subject-detail-dto';

interface ApiError {
  code: string;
  message: string;
  details: Record<string, string[]> | null;
}

function isApiError(err: unknown): err is ApiError {
  return err !== null && typeof err === 'object' && 'code' in err && 'message' in err;
}

@Component({
  selector: 'app-subject-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './subject-detail.html',
})
export class SubjectDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly subjectService = inject(SubjectService);
  private readonly notification = inject(NotificationService);

  readonly subject = signal<SubjectDetailDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly confirmingDelete = signal(false);

  private subjectId = 0;

  ngOnInit(): void {
    this.subjectId = Number(this.route.snapshot.params['id']);
    this.subjectService.getById(this.subjectId).subscribe({
      next: (data) => {
        this.subject.set(data);
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
    this.subjectService.delete(this.subjectId).subscribe({
      next: () => {
        this.notification.show('success', 'Subject deleted successfully.');
        this.router.navigateByUrl('/admin/subjects');
      },
      error: (err: unknown) => {
        this.confirmingDelete.set(false);
        if (isApiError(err)) {
          this.error.set(err.message);
        }
      },
    });
  }
}
