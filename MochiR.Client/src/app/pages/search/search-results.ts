import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Subject,
  Subscription,
  catchError,
  debounceTime,
  defer,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { SearchService } from '../../core/services/search.service';
import { SearchResultDto } from '../../api/models/search-result-dto';
import { SearchResponseDto } from '../../api/models/search-response-dto';
import { isApiError } from '../../core/utils/api-error';

interface SearchRouteState {
  query: string;
  type: string;
  sort: string;
}

type SearchRouteResult =
  | { kind: 'idle' }
  | { kind: 'success'; response: SearchResponseDto }
  | { kind: 'error'; message: string };

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [DatePipe, RouterLink],
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
  private readonly searchTrigger = new Subject<SearchRouteState>();
  private skipNextDebouncedQuery: string | null = null;
  private loadMoreSubscription: Subscription | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.cancelLoadMore());
  }

  ngOnInit(): void {
    this.inputSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => {
        const trimmed = q.trim();
        if (this.skipNextDebouncedQuery === trimmed) {
          this.skipNextDebouncedQuery = null;
          return;
        }

        this.navigateWithQuery(q, this.activeType(), this.activeSort(), true);
      });

    this.searchTrigger
      .pipe(
        tap(() => this.cancelLoadMore()),
        switchMap((state) => this.searchFromRouteState(state)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.applySearchRouteResult(result));

    this.route.queryParams
      .pipe(
        map(
          (params): SearchRouteState => ({
            query: params['q'] || '',
            type: params['type'] || 'all',
            sort: params['sort'] || 'relevance',
          }),
        ),
        distinctUntilChanged(
          (previous, current) =>
            previous.query === current.query &&
            previous.type === current.type &&
            previous.sort === current.sort,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => {
        this.query.set(state.query);
        this.activeType.set(state.type);
        this.activeSort.set(state.sort);
        this.searchTrigger.next(state);
      });
  }

  private executeSearch(q: string, type?: string, sort?: string, cursor?: string): void {
    if (cursor) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
    }
    this.error.set(null);

    this.cancelLoadMore();
    this.loadMoreSubscription = this.searchService
      .search(this.buildSearchParams(q, type, sort, cursor))
      .subscribe({
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
      this.searchTrigger.next({
        query: q,
        type: this.activeType(),
        sort: this.activeSort(),
      });
    }
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (cursor && !this.loadingMore()) {
      this.executeSearch(this.query(), this.activeType(), this.activeSort(), cursor);
    }
  }

  onTypeChange(type: string): void {
    this.navigateWithQuery(this.query(), type, this.activeSort());
  }

  onSortChange(sort: string): void {
    this.navigateWithQuery(this.query(), this.activeType(), sort);
  }

  getResultCommands(result: SearchResultDto): string[] {
    if (result.type === 'Subject' && result.subjectId != null) {
      return ['/reviews'];
    }
    if (result.type === 'Review' && result.reviewId != null) {
      return ['/reviews', String(result.reviewId)];
    }
    return ['/search'];
  }

  getResultQueryParams(result: SearchResultDto): Record<string, number> | undefined {
    if (result.type === 'Subject' && result.subjectId != null) {
      return { subjectId: result.subjectId };
    }

    return undefined;
  }

  onInputChange(value: string): void {
    this.query.set(value);
    this.inputSubject.next(value);
  }

  onSearch(event: Event): void {
    event.preventDefault();
    this.skipNextDebouncedQuery = this.query().trim();
    this.navigateWithQuery(this.query(), this.activeType(), this.activeSort(), true);
  }

  private navigateWithQuery(query: string, type: string, sort: string, replaceUrl = false): void {
    this.router.navigate(['/search'], {
      queryParams: this.buildQueryParams(query, type, sort),
      replaceUrl,
    });
  }

  private buildSearchParams(
    query: string,
    type?: string,
    sort?: string,
    cursor?: string,
  ): { query: string; type?: string; sort?: string; cursor?: string } {
    const params: { query: string; type?: string; sort?: string; cursor?: string } = { query };

    if (type && type !== 'all') {
      params.type = type;
    }

    if (sort && sort !== 'relevance') {
      params.sort = sort;
    }

    if (cursor) {
      params.cursor = cursor;
    }

    return params;
  }

  private buildQueryParams(query: string, type: string, sort: string): Record<string, string> {
    const params: Record<string, string> = {};
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      params['q'] = trimmedQuery;
      params['type'] = type;
      params['sort'] = sort;
    }

    return params;
  }

  private searchFromRouteState(state: SearchRouteState) {
    const trimmedQuery = state.query.trim();

    if (!trimmedQuery) {
      return of<SearchRouteResult>({ kind: 'idle' });
    }

    return defer(() => {
      this.results.set([]);
      this.nextCursor.set(null);
      this.loading.set(true);
      this.loadingMore.set(false);
      this.error.set(null);

      return this.searchService
        .search(this.buildSearchParams(trimmedQuery, state.type, state.sort))
        .pipe(
          map((response): SearchRouteResult => ({ kind: 'success', response })),
          catchError((err) =>
            of<SearchRouteResult>({
              kind: 'error',
              message: isApiError(err) ? err.message : 'An unexpected error occurred',
            }),
          ),
        );
    });
  }

  private applySearchRouteResult(result: SearchRouteResult): void {
    if (result.kind === 'idle') {
      this.results.set([]);
      this.nextCursor.set(null);
      this.loading.set(false);
      this.loadingMore.set(false);
      this.error.set(null);
      return;
    }

    if (result.kind === 'success') {
      this.results.set(result.response.results);
      this.nextCursor.set(result.response.nextCursor);
      this.loading.set(false);
      return;
    }

    this.error.set(result.message);
    this.loading.set(false);
  }

  private cancelLoadMore(): void {
    this.loadMoreSubscription?.unsubscribe();
    this.loadMoreSubscription = null;
  }
}
