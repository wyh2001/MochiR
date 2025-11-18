using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MochiR.Api.Dtos;
using MochiR.Api.Infrastructure;

namespace MochiR.Api.Services.Search;

public sealed class SearchService(ApplicationDbContext dbContext) : ISearchService
{
    private const int DefaultLimit = 20;
    private const int MaxLimit = 50;
    private static readonly JsonSerializerOptions CursorSerializerOptions = new(JsonSerializerDefaults.Web);
    private readonly ApplicationDbContext dbContext = dbContext;

    public async Task<SearchResultSet> SearchAsync(SearchOptions options, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(options.Query))
        {
            return SearchResultSet.Empty;
        }

        var trimmedQuery = options.Query.Trim();
        var limit = options.Limit <= 0 ? DefaultLimit : Math.Min(options.Limit, MaxLimit);
        var cursorState = DecodeCursor(options.Sort, options.Cursor);

        if (cursorState is not null && cursorState.Sort != options.Sort)
        {
            throw new ArgumentException("Cursor sort mismatch.");
        }

        return await SearchRelationalAsync(trimmedQuery, options, limit, cursorState, cancellationToken);
    }

    private async Task<SearchResultSet> SearchRelationalAsync(string query, SearchOptions options, int limit, SearchCursorState? cursor, CancellationToken cancellationToken)
    {
        var subjectQuery = dbContext.Subjects
            .AsNoTracking()
            .Where(subject => !subject.IsDeleted && subject.SearchVector != null && subject.SearchVector.Matches(EF.Functions.WebSearchToTsQuery("simple", query)))
            .Select(subject => new SearchProjection(
                SearchResultType.Subject,
                0,
                subject.Id,
                subject.Id,
                null,
                subject.Name,
                subject.Slug,
                null,
                subject.SearchVector!.Rank(EF.Functions.WebSearchToTsQuery("simple", query)),
                subject.CreatedAt));

        var reviewQuery = dbContext.Reviews
            .AsNoTracking()
            .Where(review => !review.IsDeleted && review.Subject != null && !review.Subject.IsDeleted && review.SearchVector != null && review.SearchVector.Matches(EF.Functions.WebSearchToTsQuery("simple", query)))
            .Select(review => new SearchProjection(
                SearchResultType.Review,
                1,
                review.Id,
                null,
                review.Id,
                review.Title ?? (review.Subject != null ? review.Subject.Name ?? string.Empty : string.Empty),
                review.Subject != null ? review.Subject.Name : null,
                review.Excerpt ?? review.Content,
                review.SearchVector!.Rank(EF.Functions.WebSearchToTsQuery("simple", query)),
                review.CreatedAt));

        if (options.Type == SearchResource.All)
        {
            var subjects = await subjectQuery.ToListAsync(cancellationToken);
            var reviews = await reviewQuery.ToListAsync(cancellationToken);
            IEnumerable<SearchProjection> combined = subjects.Concat(reviews);

            if (cursor is not null)
            {
                combined = ApplyCursor(combined.AsQueryable(), options.Sort, cursor);
            }

            var orderedCombined = options.Sort == SearchSort.Latest
                ? combined.OrderByDescending(item => item.CreatedAtUtc)
                    .ThenByDescending(item => item.TypeOrder)
                    .ThenByDescending(item => item.PrimaryId)
                : combined.OrderByDescending(item => item.Score)
                    .ThenByDescending(item => item.CreatedAtUtc)
                    .ThenByDescending(item => item.TypeOrder)
                    .ThenByDescending(item => item.PrimaryId);

            var materializedAll = orderedCombined.Take(limit + 1).ToList();
            return BuildResult(materializedAll, limit, options.Sort);
        }
        else
        {
            var baseQuery = options.Type == SearchResource.Subjects ? subjectQuery : reviewQuery;

            if (cursor is not null)
            {
                baseQuery = ApplyCursor(baseQuery, options.Sort, cursor);
            }

            var orderedQuery = options.Sort == SearchSort.Latest
                ? baseQuery.OrderByDescending(item => item.CreatedAtUtc)
                    .ThenByDescending(item => item.TypeOrder)
                    .ThenByDescending(item => item.PrimaryId)
                : baseQuery.OrderByDescending(item => item.Score)
                    .ThenByDescending(item => item.CreatedAtUtc)
                    .ThenByDescending(item => item.TypeOrder)
                    .ThenByDescending(item => item.PrimaryId);

            var materialized = await orderedQuery
                .Take(limit + 1)
                .ToListAsync(cancellationToken);

            return BuildResult(materialized, limit, options.Sort);
        }
    }

    private static SearchResultSet BuildResult(IList<SearchProjection> items, int limit, SearchSort sort)
    {
        string? nextCursor = null;
        if (items.Count > limit)
        {
            var last = items[^1];
            nextCursor = EncodeCursor(sort, last);
            items.RemoveAt(items.Count - 1);
        }

        var results = items
            .Select(item => new SearchResultDto(
                item.Type,
                item.SubjectId,
                item.ReviewId,
                item.Title,
                item.Subtitle,
                item.Excerpt,
                item.Score,
                EnsureUtc(item.CreatedAtUtc)))
            .ToList();

        return new SearchResultSet(results, nextCursor);
    }

    private static SearchCursorState? DecodeCursor(SearchSort sort, string? rawCursor)
    {
        if (string.IsNullOrWhiteSpace(rawCursor))
        {
            return null;
        }

        try
        {
            var bytes = Convert.FromBase64String(rawCursor);
            var state = JsonSerializer.Deserialize<SearchCursorState>(bytes, CursorSerializerOptions);
            if (state is null)
            {
                throw new ArgumentException("Invalid cursor payload.");
            }

            if (state.Sort != sort)
            {
                throw new ArgumentException("Cursor sort mismatch.");
            }

            return state;
        }
        catch (FormatException exception)
        {
            throw new ArgumentException("Invalid cursor.", exception);
        }
        catch (JsonException exception)
        {
            throw new ArgumentException("Invalid cursor.", exception);
        }
    }

    private static string EncodeCursor(SearchSort sort, SearchProjection projection)
    {
        var state = new SearchCursorState(
            sort,
            sort == SearchSort.Relevance ? projection.Score : null,
            EnsureUtc(projection.CreatedAtUtc),
            projection.TypeOrder,
            projection.PrimaryId);

        return Convert.ToBase64String(JsonSerializer.SerializeToUtf8Bytes(state, CursorSerializerOptions));
    }

    private static IQueryable<SearchProjection> ApplyCursor(IQueryable<SearchProjection> query, SearchSort sort, SearchCursorState cursor)
    {
        return sort == SearchSort.Latest
            ? query.Where(item =>
                item.CreatedAtUtc < cursor.CreatedAtUtc ||
                (item.CreatedAtUtc == cursor.CreatedAtUtc && item.TypeOrder < cursor.TypeOrder) ||
                (item.CreatedAtUtc == cursor.CreatedAtUtc && item.TypeOrder == cursor.TypeOrder && item.PrimaryId < cursor.PrimaryId))
            : query.Where(item =>
                item.Score < cursor.Score!.Value ||
                (item.Score == cursor.Score && item.CreatedAtUtc < cursor.CreatedAtUtc) ||
                (item.Score == cursor.Score && item.CreatedAtUtc == cursor.CreatedAtUtc && item.TypeOrder < cursor.TypeOrder) ||
                (item.Score == cursor.Score && item.CreatedAtUtc == cursor.CreatedAtUtc && item.TypeOrder == cursor.TypeOrder && item.PrimaryId < cursor.PrimaryId));
    }

    private static DateTime EnsureUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }

    private sealed record SearchProjection(
        SearchResultType Type,
        int TypeOrder,
        long PrimaryId,
        int? SubjectId,
        long? ReviewId,
        string Title,
        string? Subtitle,
        string? Excerpt,
        double Score,
        DateTime CreatedAtUtc);

    private sealed record SearchCursorState(
        SearchSort Sort,
        double? Score,
        DateTime CreatedAtUtc,
        int TypeOrder,
        long PrimaryId);
}
