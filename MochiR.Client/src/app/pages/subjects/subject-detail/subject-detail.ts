import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SubjectService } from '../../../core/services/subject.service';
import { SubjectDetailDto } from '../../../api/models/subject-detail-dto';

interface ApiError {
  code: string;
  message: string;
  details: Record<string, string[]> | null;
}

function isApiError(err: unknown): err is ApiError {
  return err !== null && typeof err === 'object' && 'code' in err && 'message' in err;
}

@Component({
  selector: 'app-public-subject-detail',
  standalone: true,
  templateUrl: './subject-detail.html',
})
export class PublicSubjectDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly subjectService = inject(SubjectService);

  readonly subject = signal<SubjectDetailDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.params['id']);
    this.subjectService.getById(id).subscribe({
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
}
