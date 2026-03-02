import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SubjectTypeService } from '../../../core/services/subject-type.service';
import { SubjectTypeSummaryDto } from '../../../api/models/subject-type-summary-dto';

@Component({
  selector: 'app-public-subject-type-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './subject-type-list.html',
})
export class PublicSubjectTypeList implements OnInit {
  private readonly subjectTypeService = inject(SubjectTypeService);

  readonly subjectTypes = signal<SubjectTypeSummaryDto[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
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
