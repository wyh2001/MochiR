import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CriteriaTemplateService } from '../../../../core/services/criteria-template.service';
import { CriteriaTemplateDetailDto } from '../../../../api/models/criteria-template-detail-dto';

interface ApiError {
  code: string;
  message: string;
  details: Record<string, string[]> | null;
}

function isApiError(err: unknown): err is ApiError {
  return err !== null && typeof err === 'object' && 'code' in err && 'message' in err;
}

@Component({
  selector: 'app-criteria-template-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './criteria-template-detail.html',
})
export class CriteriaTemplateDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly criteriaTemplateService = inject(CriteriaTemplateService);

  readonly template = signal<CriteriaTemplateDetailDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.params['id']);
    this.criteriaTemplateService.getById(id).subscribe({
      next: (data) => {
        this.template.set(data);
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
