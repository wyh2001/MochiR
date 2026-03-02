import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, filter } from 'rxjs';
import { SearchService } from '../../core/services/search.service';
import { SearchResultDto } from '../../api/models/search-result-dto';
import { isApiError } from '../../core/utils/api-error';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './search-results.html',
})
export class SearchResults implements OnInit {
  private readonly searchService = inject(SearchService);
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly results = signal<SearchResultDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly query = signal('');
  readonly activeType = signal('all');
  readonly activeSort = signal('relevance');
  readonly nextCursor = signal<string | null>(null);
  readonly loadingMore = signal(false);
  private readonly inputSubject = new Subject<string>();

  ngOnInit(): void {
    this.inputSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter((q) => q.trim().length > 0),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((q) => {
        this.router.navigate(['/search'], {
          queryParams: { q, type: this.activeType(), sort: this.activeSort() },
          replaceUrl: true,
        });
      });

    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const q = params['q'] || '';
      const type = params['type'] || 'all';
      const sort = params['sort'] || 'relevance';
      this.query.set(q);
      this.activeType.set(type);
      this.activeSort.set(sort);
      if (q.trim()) {
        this.results.set([]);
        this.nextCursor.set(null);
        this.executeSearch(q, type, sort);
      }
    });
  }

  private executeSearch(q: string, type?: string, sort?: string, cursor?: string): void {
    if (cursor) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
    }
    this.error.set(null);
    const params: { query: string; type?: string; sort?: string; cursor?: string } = { query: q };
    if (type && type !== 'all') params.type = type;
    if (sort && sort !== 'relevance') params.sort = sort;
    if (cursor) params.cursor = cursor;
    this.searchService.search(params).subscribe({
      next: (response) => {
        if (cursor) {
          this.results.update((prev) => [...prev, ...response.results]);
        } else {
          this.results.set(response.results);
        }
        this.nextCursor.set(response.nextCursor);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: (err) => {
        this.error.set(isApiError(err) ? err.message : 'An unexpected error occurred');
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }

  retry(): void {
    const q = this.query();
    if (q.trim()) {
      this.executeSearch(q, this.activeType(), this.activeSort());
    }
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (cursor) {
      this.executeSearch(this.query(), this.activeType(), this.activeSort(), cursor);
    }
  }

  onTypeChange(type: string): void {
    this.router.navigate(['/search'], {
      queryParams: { q: this.query(), type, sort: this.activeSort() },
    });
  }

  onSortChange(sort: string): void {
    this.router.navigate(['/search'], {
      queryParams: { q: this.query(), type: this.activeType(), sort },
    });
  }

  getResultLink(result: SearchResultDto): string {
    if (result.type === 'Subject' && result.subjectId != null) {
      return '/reviews?subjectId=' + result.subjectId;
    }
    if (result.type === 'Review' && result.reviewId != null) {
      return '/reviews/' + result.reviewId;
    }
    return '#';
  }

  onInputChange(value: string): void {
    this.query.set(value);
    this.inputSubject.next(value);
  }

  onSearch(event: Event): void {
    event.preventDefault();
    const q = this.query().trim();
    if (q) {
      this.router.navigateByUrl('/search?q=' + encodeURIComponent(q));
    }
  }
}
