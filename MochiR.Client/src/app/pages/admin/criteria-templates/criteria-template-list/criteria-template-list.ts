import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CriteriaTemplateService } from '../../../../core/services/criteria-template.service';
import { SubjectTypeService } from '../../../../core/services/subject-type.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { CriteriaTemplateSummaryDto } from '../../../../api/models/criteria-template-summary-dto';
import { SubjectTypeSummaryDto } from '../../../../api/models/subject-type-summary-dto';

@Component({
  selector: 'app-criteria-template-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './criteria-template-list.html',
})
export class CriteriaTemplateList implements OnInit {
  private readonly criteriaTemplateService = inject(CriteriaTemplateService);
  private readonly subjectTypeService = inject(SubjectTypeService);
  private readonly authState = inject(AuthStateService);

  readonly isAdmin = this.authState.isAdmin;

  readonly criteriaTemplates = signal<CriteriaTemplateSummaryDto[]>([]);
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
    const subjectTypeId = value ? Number(value) : null;
    this.filterSubjectTypeId.set(subjectTypeId);
    this.loadList();
  }

  getSubjectTypeName(subjectTypeId: number): string {
    const st = this.subjectTypes().find((s) => s.id === subjectTypeId);
    return st?.displayName ?? '';
  }

  private loadList(): void {
    this.loading.set(true);
    const filter = this.filterSubjectTypeId() ?? undefined;
    this.criteriaTemplateService.getAll(filter).subscribe({
      next: (data) => {
        this.criteriaTemplates.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}
