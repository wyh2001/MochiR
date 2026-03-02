import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SubjectService } from '../../../core/services/subject.service';
import { SubjectTypeService } from '../../../core/services/subject-type.service';
import { SubjectSummaryDto } from '../../../api/models/subject-summary-dto';
import { SubjectTypeSummaryDto } from '../../../api/models/subject-type-summary-dto';

@Component({
  selector: 'app-public-subject-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './subject-list.html',
})
export class PublicSubjectList implements OnInit {
  private readonly subjectService = inject(SubjectService);
  private readonly subjectTypeService = inject(SubjectTypeService);

  readonly subjects = signal<SubjectSummaryDto[]>([]);
  readonly subjectTypes = signal<SubjectTypeSummaryDto[]>([]);
  readonly loading = signal(true);
  readonly filterSubjectTypeId = signal<number | null>(null);

  ngOnInit(): void {
    this.subjectTypeService.getAll().subscribe({
      next: (data) => this.subjectTypes.set(data),
    });
    this.loadList();
  }

  onFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const id = value ? Number(value) : null;
    this.filterSubjectTypeId.set(id);
    this.loadList();
  }

  getSubjectTypeName(subjectTypeId: number): string {
    const st = this.subjectTypes().find((t) => t.id === subjectTypeId);
    return st ? st.displayName : String(subjectTypeId);
  }

  private loadList(): void {
    this.loading.set(true);
    const filter = this.filterSubjectTypeId() ?? undefined;
    this.subjectService.getAll(filter).subscribe({
      next: (data) => {
        this.subjects.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}
