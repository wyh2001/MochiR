using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MochiR.Api.Entities;
using MochiR.Api.Dtos;
using MochiR.Api.Infrastructure;
using MochiR.Api.Infrastructure.Validation;

namespace MochiR.Api.Endpoints
{
    public static partial class FeedEndpoints
    {
        private const int DefaultPageSize = 20;
        private const int MaxPageSize = 100;

        public static void MapFeedEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/feed")
                .WithTags("Feed")
                .RequireAuthorization();

            group.MapGet("/", async (
                [AsParameters] FeedQueryDto query,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                var currentUserId = userManager.GetUserId(httpContext.User);
                if (string.IsNullOrEmpty(currentUserId))
                {
                    return ApiResults.Failure(
                        "AUTH_UNAUTHORIZED",
                        "User is not authenticated.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                var (page, pageSize) = NormalizePagination(query.Page, query.PageSize);
                var effectivePage = query.After.HasValue ? 1 : page;

                var follows = await db.Follows
                    .AsNoTracking()
                    .Where(f => f.FollowerId == currentUserId)
                    .ToListAsync(cancellationToken);

                var followedUserIds = follows
                    .Where(f => f.TargetType == FollowTargetType.User && f.FollowedUserId != null)
                    .Select(f => f.FollowedUserId!)
                    .ToList();
                var followedSubjectIds = follows
                    .Where(f => f.TargetType == FollowTargetType.Subject && f.SubjectId.HasValue)
                    .Select(f => f.SubjectId!.Value)
                    .ToList();
                var followedSubjectTypeIds = follows
                    .Where(f => f.TargetType == FollowTargetType.SubjectType && f.SubjectTypeId.HasValue)
                    .Select(f => f.SubjectTypeId!.Value)
                    .ToList();

                if (followedUserIds.Count == 0 && followedSubjectIds.Count == 0 && followedSubjectTypeIds.Count == 0)
                {
                    var emptyPayload = new FeedPageDto(0, effectivePage, pageSize, Array.Empty<FeedItemDto>(), null, false);
                    return ApiResults.Ok(emptyPayload, httpContext);
                }

                var feedBaseQuery = db.Reviews
                    .AsNoTracking()
                    .Where(r => !r.IsDeleted && r.Status == ReviewStatus.Approved)
                    .Where(r =>
                        (followedUserIds.Count > 0 && followedUserIds.Contains(r.UserId)) ||
                        (followedSubjectIds.Count > 0 && followedSubjectIds.Contains(r.SubjectId)) ||
                        (followedSubjectTypeIds.Count > 0 && r.Subject != null && followedSubjectTypeIds.Contains(r.Subject.SubjectTypeId)));

                var totalCount = await feedBaseQuery.CountAsync(cancellationToken);

                if (totalCount == 0)
                {
                    var emptyPayload = new FeedPageDto(0, effectivePage, pageSize, Array.Empty<FeedItemDto>(), null, false);
                    return ApiResults.Ok(emptyPayload, httpContext);
                }

                var feedQuery = feedBaseQuery
                    .Include(r => r.Subject)
                    .Include(r => r.User);

                IQueryable<Review> filteredQuery = feedQuery;

                if (query.After.HasValue)
                {
                    var after = query.After.Value;
                    var afterId = query.AfterId ?? long.MaxValue;
                    filteredQuery = filteredQuery.Where(r =>
                        r.CreatedAt < after ||
                        (r.CreatedAt == after && r.Id < afterId));
                }

                var orderedQuery = filteredQuery
                    .OrderByDescending(r => r.CreatedAt)
                    .ThenByDescending(r => r.Id);

                var skip = query.After.HasValue ? 0 : (effectivePage - 1) * pageSize;
                var take = pageSize + 1;

                var rawItems = await orderedQuery
                    .Skip(skip)
                    .Take(take)
                    .Select(r => new
                    {
                        r.Id,
                        r.Title,
                        r.Content,
                        r.CreatedAt,
                        r.Subject,
                        r.SubjectId,
                        r.User
                    })
                    .ToListAsync(cancellationToken);

                var hasMore = rawItems.Count > pageSize;
                if (hasMore)
                {
                    rawItems.RemoveAt(pageSize);
                }

                var items = rawItems
                    .Select(r => new FeedItemDto(
                        r.Id,
                        r.CreatedAt,
                        r.SubjectId,
                        r.Subject?.Name,
                        r.Subject?.Slug,
                        r.Subject?.SubjectTypeId,
                        r.Title,
                        r.Content,
                        r.User?.Id,
                        r.User?.UserName,
                        r.User?.DisplayName,
                        r.User?.AvatarUrl))
                    .ToList();

                FeedCursorDto? nextCursor = null;
                if (hasMore && items.Count > 0)
                {
                    var last = items[^1];
                    nextCursor = new FeedCursorDto(last.CreatedAtUtc, last.ReviewId);
                }

                var payload = new FeedPageDto(
                    totalCount,
                    effectivePage,
                    pageSize,
                    items,
                    nextCursor,
                    hasMore);

                return ApiResults.Ok(payload, httpContext);
            })
            .Produces<ApiResponse<FeedPageDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .Produces<ApiResponse<object>>(StatusCodes.Status401Unauthorized)
            .WithSummary("Get the authenticated user's feed.")
            .WithDescription("GET /api/feed. Requires authentication. Supports page, pageSize, after, and afterId query parameters for cursor-friendly pagination. Returns 200 with a feed page payload filtered to followed users, subjects, and subject types, or 400 when query values are invalid.")
            .AddValidation<FeedQueryDto>(
                "FEED_INVALID_QUERY",
                "One or more query parameters are invalid.")
            .WithOpenApi();
        }

        private static (int Page, int PageSize) NormalizePagination(int? page, int? pageSize)
        {
            var normalizedPage = page.HasValue && page.Value > 0 ? page.Value : 1;
            var normalizedSize = pageSize.HasValue && pageSize.Value > 0 ? Math.Min(pageSize.Value, MaxPageSize) : DefaultPageSize;
            return (normalizedPage, normalizedSize);
        }

        internal sealed record FeedQueryDto
        {
            public int? Page { get; init; }
            public int? PageSize { get; init; }
            public DateTime? After { get; init; }
            public long? AfterId { get; init; }
        }

        private record FeedCursorDto(DateTime CreatedAtUtc, long ReviewId);

        private record FeedPageDto(
            int TotalCount,
            int Page,
            int PageSize,
            IReadOnlyCollection<FeedItemDto> Items,
            FeedCursorDto? NextCursor,
            bool HasMore);

        private record FeedItemDto(
            long ReviewId,
            DateTime CreatedAtUtc,
            int SubjectId,
            string? SubjectName,
            string? SubjectSlug,
            int? SubjectTypeId,
            string? Title,
            string? Content,
            string? AuthorId,
            string? AuthorUserName,
            string? AuthorDisplayName,
            string? AuthorAvatarUrl);
    }
}
