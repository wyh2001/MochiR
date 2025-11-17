using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MochiR.Api.Entities;
using MochiR.Api.Dtos;
using MochiR.Api.Infrastructure;
using MochiR.Api.Infrastructure.Validation;
using System.Security.Claims;

namespace MochiR.Api.Endpoints
{
    public static partial class ReviewsEndpoints
    {
        private const int LatestDefaultPageSize = 20;
        private const int LatestMaxPageSize = 100;
        private const int MaxTagsPerReview = 10;
        private const int MaxTagLength = 32;
        private const int MaxTitleLength = 256;
        private const int MaxContentLength = 20000;
        private const int MaxExcerptLength = 512;
        private const int AutoExcerptLength = 200;

        public static void MapReviewsEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/reviews").WithTags("Reviews");

            group.MapGet("/latest", async (
                [AsParameters] LatestReviewsQueryDto query,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                ClaimsPrincipal user,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                var currentUserId = userManager.GetUserId(user);
                var (page, pageSize) = NormalizeLatestPagination(query.Page, query.PageSize);
                var effectivePage = query.After.HasValue ? 1 : page;

                var baseQuery = db.Reviews
                    .AsNoTracking()
                    .Where(review => !review.IsDeleted && review.Status == ReviewStatus.Approved);

                var totalCount = await baseQuery.CountAsync(cancellationToken);

                if (totalCount == 0)
                {
                    var emptyPayload = new LatestReviewsPageDto(0, effectivePage, pageSize, Array.Empty<ReviewSummaryDto>(), null, false);
                    return ApiResults.Ok(emptyPayload, httpContext);
                }

                var orderedQuery = baseQuery
                    .OrderByDescending(review => review.CreatedAt)
                    .ThenByDescending(review => review.Id);

                if (query.After.HasValue)
                {
                    var after = query.After.Value;
                    var afterId = query.AfterId ?? long.MaxValue;
                    orderedQuery = orderedQuery
                        .Where(review =>
                            review.CreatedAt < after ||
                            (review.CreatedAt == after && review.Id < afterId))
                        .OrderByDescending(review => review.CreatedAt)
                        .ThenByDescending(review => review.Id);
                }

                var skip = query.After.HasValue ? 0 : (effectivePage - 1) * pageSize;
                var take = pageSize + 1;

                var rawItems = await FetchSummariesAsync(orderedQuery.Skip(skip).Take(take), currentUserId, cancellationToken);

                var hasMore = rawItems.Count > pageSize;
                if (hasMore)
                {
                    rawItems.RemoveAt(pageSize);
                }

                LatestReviewsCursorDto? nextCursor = null;
                if (hasMore && rawItems.Count > 0)
                {
                    var last = rawItems[^1];
                    nextCursor = new LatestReviewsCursorDto(last.CreatedAt, last.Id);
                }

                var payload = new LatestReviewsPageDto(
                    totalCount,
                    effectivePage,
                    pageSize,
                    rawItems,
                    nextCursor,
                    hasMore);

                return ApiResults.Ok(payload, httpContext);
            })
            .Produces<ApiResponse<LatestReviewsPageDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .WithSummary("List the latest approved reviews.")
            .WithDescription("GET /api/reviews/latest. Supports page, pageSize, after, and afterId query parameters for cursor-friendly paging. Returns 200 with review summaries, or 400 when pagination values are invalid.")
            .AddValidation<LatestReviewsQueryDto>(
                "REVIEW_INVALID_QUERY",
                "Page and PageSize must be positive and within limits.")
            .WithOpenApi();

            group.MapGet("/", async (int? subjectId, string? userId, ApplicationDbContext db, UserManager<ApplicationUser> userManager, ClaimsPrincipal user, HttpContext httpContext, CancellationToken cancellationToken) =>
            {
                var currentUserId = userManager.GetUserId(user);
                var baseQuery = db.Reviews
                    .AsNoTracking()
                    .Where(review => !review.IsDeleted);

                if (subjectId.HasValue)
                {
                    baseQuery = baseQuery.Where(review => review.SubjectId == subjectId.Value);
                }

                if (!string.IsNullOrWhiteSpace(userId))
                {
                    baseQuery = baseQuery.Where(review => review.UserId == userId);
                }

                var reviews = await FetchSummariesAsync(baseQuery.OrderByDescending(review => review.CreatedAt), currentUserId, cancellationToken);
                return ApiResults.Ok(reviews, httpContext);
            })
            .Produces<ApiResponse<IReadOnlyList<ReviewSummaryDto>>>(StatusCodes.Status200OK)
            .WithSummary("List reviews with optional filters.")
            .WithDescription("GET /api/reviews. Supports optional subjectId and userId query parameters. Returns 200 with review summaries for matching reviews, including pending entries.")
            .WithOpenApi();

            group.MapPost("/", async (
                CreateReviewDto dto,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                ClaimsPrincipal user,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                var userId = userManager.GetUserId(user);
                if (string.IsNullOrEmpty(userId))
                {
                    return ApiResults.Failure(
                        "AUTH_UNAUTHORIZED",
                        "User is not authenticated.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                var subjectExists = await db.Subjects.AnyAsync(subject => subject.Id == dto.SubjectId, cancellationToken);
                if (!subjectExists)
                {
                    return ApiResults.Failure(
                        "REVIEW_SUBJECT_NOT_FOUND",
                        "Subject does not exist.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                var duplicate = await db.Reviews.AnyAsync(review => review.SubjectId == dto.SubjectId && review.UserId == userId && !review.IsDeleted, cancellationToken);
                if (duplicate)
                {
                    return ApiResults.Failure(
                        "REVIEW_DUPLICATE",
                        "You have already submitted a review for this subject.",
                        httpContext,
                        StatusCodes.Status409Conflict);
                }

                var normalizedTags = NormalizeTags(dto.Tags);
                var normalizedExcerpt = NormalizeExcerpt(dto.Excerpt);

                var review = new Review
                {
                    SubjectId = dto.SubjectId,
                    UserId = userId,
                    Title = dto.Title?.Trim(),
                    Content = dto.Content?.Trim(),
                    Excerpt = normalizedExcerpt,
                    Ratings = dto.Ratings?.Select(r => new ReviewRating
                    {
                        Key = r.Key,
                        Score = r.Score,
                        Label = r.Label
                    })?.ToList() ?? new List<ReviewRating>(),
                    Tags = ToEntityTags(normalizedTags),
                    Status = ReviewStatus.Pending,
                    MediaCount = 0,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                db.Reviews.Add(review);
                await db.SaveChangesAsync(cancellationToken);

                var summary = await FetchSingleSummaryAsync(db, review.Id, userId, cancellationToken);
                if (summary is null)
                {
                    return ApiResults.Failure(
                        "REVIEW_NOT_FOUND",
                        "Review not found after creation.",
                        httpContext,
                        StatusCodes.Status500InternalServerError);
                }

                return ApiResults.Created($"/api/reviews/{review.Id}", summary, httpContext);
            })
            .Produces<ApiResponse<ReviewSummaryDto>>(StatusCodes.Status201Created)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .Produces<ApiResponse<object>>(StatusCodes.Status401Unauthorized)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict)
            .WithSummary("Create a review.")
            .WithDescription("POST /api/reviews. Requires authentication. Accepts subjectId, optional title/content, and optional ratings. Returns 201 with the created review summary, or 400/401/409 when validation fails.")
            .AddValidation<CreateReviewDto>(
                "REVIEW_INVALID_INPUT",
                "One or more fields are invalid.")
            .RequireAuthorization()
            .WithOpenApi();

            group.MapPut("/{id:long}", async (
                long id,
                UpdateReviewDto dto,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                ClaimsPrincipal user,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                var userId = userManager.GetUserId(user);
                if (string.IsNullOrEmpty(userId))
                {
                    return ApiResults.Failure(
                        "AUTH_UNAUTHORIZED",
                        "User is not authenticated.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                var review = await db.Reviews.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
                if (review is null || review.IsDeleted)
                {
                    return ApiResults.Failure(
                        "REVIEW_NOT_FOUND",
                        "Review not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                if (!string.Equals(review.UserId, userId, StringComparison.Ordinal))
                {
                    return ApiResults.Failure(
                        "AUTH_FORBIDDEN",
                        "You are not allowed to modify this review.",
                        httpContext,
                        StatusCodes.Status403Forbidden);
                }

                review.Title = dto.Title.Trim();
                review.Content = string.IsNullOrWhiteSpace(dto.Content) ? null : dto.Content.Trim();
                review.Ratings = dto.Ratings?.Select(r => new ReviewRating
                {
                    Key = r.Key,
                    Score = r.Score,
                    Label = r.Label
                })?.ToList() ?? new List<ReviewRating>();
                var normalizedTags = NormalizeTags(dto.Tags);
                review.Tags = ToEntityTags(normalizedTags);
                review.Excerpt = NormalizeExcerpt(dto.Excerpt);
                review.Status = ReviewStatus.Pending;
                review.UpdatedAt = DateTime.UtcNow;

                await db.SaveChangesAsync(cancellationToken);

                var summary = await FetchSingleSummaryAsync(db, review.Id, userId, cancellationToken);
                if (summary is null)
                {
                    return ApiResults.Failure(
                        "REVIEW_NOT_FOUND",
                        "Review not found after update.",
                        httpContext,
                        StatusCodes.Status500InternalServerError);
                }

                return ApiResults.Ok(summary, httpContext);
            })
            .Produces<ApiResponse<ReviewSummaryDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .Produces<ApiResponse<object>>(StatusCodes.Status401Unauthorized)
            .Produces<ApiResponse<object>>(StatusCodes.Status403Forbidden)
            .Produces<ApiResponse<object>>(StatusCodes.Status404NotFound)
            .WithSummary("Update a review.")
            .WithDescription("PUT /api/reviews/{id}. Requires authentication. Only the author may update the review. Accepts title, content, and ratings, returning 200 with the updated review summary or 400/401/403/404 when validation fails.")
            .AddValidation<UpdateReviewDto>(
                "REVIEW_INVALID_INPUT",
                "One or more fields are invalid.")
            .RequireAuthorization()
            .WithOpenApi();

            group.MapDelete("/{id:long}", async (
                long id,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                ClaimsPrincipal user,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                var userId = userManager.GetUserId(user);
                if (string.IsNullOrEmpty(userId))
                {
                    return ApiResults.Failure(
                        "AUTH_UNAUTHORIZED",
                        "User is not authenticated.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                var review = await db.Reviews.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
                if (review is null || review.IsDeleted)
                {
                    return ApiResults.Failure(
                        "REVIEW_NOT_FOUND",
                        "Review not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                if (!string.Equals(review.UserId, userId, StringComparison.Ordinal))
                {
                    return ApiResults.Failure(
                        "AUTH_FORBIDDEN",
                        "You are not allowed to delete this review.",
                        httpContext,
                        StatusCodes.Status403Forbidden);
                }

                review.IsDeleted = true;
                review.Status = ReviewStatus.Pending;
                review.UpdatedAt = DateTime.UtcNow;

                await db.SaveChangesAsync(cancellationToken);

                return ApiResults.Ok(new ReviewDeleteResultDto(id, true), httpContext);
            })
            .Produces<ApiResponse<ReviewDeleteResultDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status401Unauthorized)
            .Produces<ApiResponse<object>>(StatusCodes.Status403Forbidden)
            .Produces<ApiResponse<object>>(StatusCodes.Status404NotFound)
            .WithSummary("Delete a review.")
            .WithDescription("DELETE /api/reviews/{id}. Requires authentication. Only the author may delete their review. Returns 200 with deletion status or 401/403/404 when the operation is not permitted.")
            .RequireAuthorization()
            .WithOpenApi();

            group.MapPost("/{id:long}/like", async (
                long id,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                ClaimsPrincipal user,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                var currentUserId = userManager.GetUserId(user);
                if (string.IsNullOrEmpty(currentUserId))
                {
                    return ApiResults.Failure(
                        "AUTH_UNAUTHORIZED",
                        "User is not authenticated.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                var review = await db.Reviews.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
                if (review is null || review.IsDeleted)
                {
                    return ApiResults.Failure(
                        "REVIEW_NOT_FOUND",
                        "Review not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                if (string.Equals(review.UserId, currentUserId, StringComparison.Ordinal))
                {
                    return ApiResults.Failure(
                        "AUTH_FORBIDDEN",
                        "You are not allowed to like your own review.",
                        httpContext,
                        StatusCodes.Status403Forbidden);
                }

                var alreadyLiked = await db.ReviewLikes.AnyAsync(like => like.ReviewId == id && like.UserId == currentUserId, cancellationToken);
                if (!alreadyLiked)
                {
                    db.ReviewLikes.Add(new ReviewLike
                    {
                        ReviewId = id,
                        UserId = currentUserId
                    });
                    await db.SaveChangesAsync(cancellationToken);
                }

                var (likeCount, isLikedByCurrentUser) = await GetLikeStateAsync(db, id, currentUserId, cancellationToken);
                var payload = new ReviewLikeResultDto(id, likeCount, isLikedByCurrentUser);
                return ApiResults.Ok(payload, httpContext);
            })
            .Produces<ApiResponse<ReviewLikeResultDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status401Unauthorized)
            .Produces<ApiResponse<object>>(StatusCodes.Status403Forbidden)
            .Produces<ApiResponse<object>>(StatusCodes.Status404NotFound)
            .WithSummary("Like a review.")
            .WithDescription("POST /api/reviews/{id}/like. Requires authentication. Adds a like for the specified review unless already liked. Returns 200 with the updated like state.")
            .RequireAuthorization()
            .WithOpenApi();

            group.MapDelete("/{id:long}/like", async (
                long id,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                ClaimsPrincipal user,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                var currentUserId = userManager.GetUserId(user);
                if (string.IsNullOrEmpty(currentUserId))
                {
                    return ApiResults.Failure(
                        "AUTH_UNAUTHORIZED",
                        "User is not authenticated.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                var review = await db.Reviews.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
                if (review is null || review.IsDeleted)
                {
                    return ApiResults.Failure(
                        "REVIEW_NOT_FOUND",
                        "Review not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                var existingLike = await db.ReviewLikes.FirstOrDefaultAsync(like => like.ReviewId == id && like.UserId == currentUserId, cancellationToken);
                if (existingLike is not null)
                {
                    db.ReviewLikes.Remove(existingLike);
                    await db.SaveChangesAsync(cancellationToken);
                }

                var (likeCount, isLikedByCurrentUser) = await GetLikeStateAsync(db, id, currentUserId, cancellationToken);
                var payload = new ReviewLikeResultDto(id, likeCount, isLikedByCurrentUser);
                return ApiResults.Ok(payload, httpContext);
            })
            .Produces<ApiResponse<ReviewLikeResultDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status401Unauthorized)
            .Produces<ApiResponse<object>>(StatusCodes.Status404NotFound)
            .WithSummary("Unlike a review.")
            .WithDescription("DELETE /api/reviews/{id}/like. Requires authentication. Removes the current user's like if it exists. Returns 200 with the updated like state.")
            .RequireAuthorization()
            .WithOpenApi();

            group.MapGet("/{id:long}", async (long id, ApplicationDbContext db, UserManager<ApplicationUser> userManager, ClaimsPrincipal user, HttpContext httpContext, CancellationToken cancellationToken) =>
            {
                var currentUserId = userManager.GetUserId(user);
                var review = await db.Reviews
                    .AsNoTracking()
                    .Include(r => r.Subject)
                    .Include(r => r.User)
                    .Include(r => r.Tags)
                    .Include(r => r.Media)
                    .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

                if (review is null || review.IsDeleted)
                {
                    return ApiResults.Failure(
                        "REVIEW_NOT_FOUND",
                        "Review not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                var media = review.Media
                    .Select(m => new ReviewMediaDto(
                        m.Id,
                        m.Url,
                        m.Type,
                        m.Metadata.Select(md => new ReviewMediaMetadataDto(md.Key, md.Value, md.Note)).ToList()))
                    .ToList();

                var ratings = review.Ratings
                    .Select(r => new ReviewRatingDto(r.Key, r.Score, r.Label))
                    .ToList();

                var tags = review.Tags
                    .Select(t => t.Value)
                    .ToList();

                var (excerpt, excerptIsAuto) = ResolveExcerpt(review.Excerpt, review.Content);

                var (likeCount, isLikedByCurrentUser) = await GetLikeStateAsync(db, id, currentUserId, cancellationToken);

                var payload = new ReviewDetailDto(
                    review.Id,
                    review.SubjectId,
                    review.Subject?.Name,
                    review.Subject?.Slug,
                    review.UserId,
                    review.User?.UserName,
                    review.User?.DisplayName,
                    review.User?.AvatarUrl,
                    review.Title,
                    review.Content,
                    excerpt,
                    excerptIsAuto,
                    tags,
                    ratings,
                    likeCount,
                    isLikedByCurrentUser,
                    review.Status,
                    review.CreatedAt,
                    review.UpdatedAt,
                    media);

                return ApiResults.Ok(payload, httpContext);
            })
            .Produces<ApiResponse<ReviewDetailDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status404NotFound)
            .WithSummary("Get review details.")
            .WithDescription("GET /api/reviews/{id}. Returns 200 with the full review, including subject data, author info, ratings, and media. Responds with 404 if the review does not exist or has been deleted.")
            .WithOpenApi();
        }

        private static (int Page, int PageSize) NormalizeLatestPagination(int? page, int? pageSize)
        {
            var normalizedPage = page.HasValue && page.Value > 0 ? page.Value : 1;
            var normalizedSize = pageSize.HasValue && pageSize.Value > 0
                ? Math.Min(pageSize.Value, LatestMaxPageSize)
                : LatestDefaultPageSize;
            return (normalizedPage, normalizedSize);
        }

        private static IReadOnlyList<string> NormalizeTags(IReadOnlyList<string>? tags)
        {
            if (tags is null || tags.Count == 0)
            {
                return Array.Empty<string>();
            }

            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var normalized = new List<string>(Math.Min(tags.Count, MaxTagsPerReview));

            foreach (var tag in tags)
            {
                if (string.IsNullOrWhiteSpace(tag))
                {
                    continue;
                }

                var trimmed = tag.Trim();
                if (trimmed.Length == 0 || trimmed.Length > MaxTagLength)
                {
                    continue;
                }

                if (seen.Add(trimmed))
                {
                    normalized.Add(trimmed);
                    if (normalized.Count >= MaxTagsPerReview)
                    {
                        break;
                    }
                }
            }

            return normalized;
        }

        private static List<ReviewTag> ToEntityTags(IReadOnlyList<string> tags) =>
            tags.Select(tag => new ReviewTag { Value = tag }).ToList();

        private static bool HaveDistinctTags(IReadOnlyList<string>? tags)
        {
            if (tags is null || tags.Count <= 1)
            {
                return true;
            }

            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var tag in tags)
            {
                if (string.IsNullOrWhiteSpace(tag))
                {
                    continue;
                }

                var trimmed = tag.Trim();
                if (!seen.Add(trimmed))
                {
                    return false;
                }
            }

            return true;
        }

        internal sealed record LatestReviewsQueryDto
        {
            public int? Page { get; init; }
            public int? PageSize { get; init; }
            public DateTime? After { get; init; }
            public long? AfterId { get; init; }
        }

        private record LatestReviewsPageDto(
            int TotalCount,
            int Page,
            int PageSize,
            IReadOnlyCollection<ReviewSummaryDto> Items,
            LatestReviewsCursorDto? NextCursor,
            bool HasMore);

        private record LatestReviewsCursorDto(DateTime CreatedAtUtc, long ReviewId);

        internal record CreateReviewDto(int SubjectId, string? Title, string? Content, string? Excerpt, IReadOnlyList<ReviewRatingDto>? Ratings, IReadOnlyList<string>? Tags);

        private static async Task<List<ReviewSummaryDto>> FetchSummariesAsync(IQueryable<Review> source, string? currentUserId, CancellationToken cancellationToken)
        {
            var summaries = await ProjectSummaryData(source, currentUserId)
                .ToListAsync(cancellationToken);

            return summaries.Select(summary =>
            {
                var (excerpt, isAuto) = ResolveExcerpt(summary.Excerpt, summary.Content);
                return new ReviewSummaryDto(
                    summary.Id,
                    summary.SubjectId,
                    summary.SubjectName,
                    summary.UserId,
                    summary.AuthorUserName,
                    summary.AuthorDisplayName,
                    summary.AuthorAvatarUrl,
                    summary.Title,
                    summary.Content,
                    excerpt,
                    isAuto,
                    summary.Ratings,
                    summary.Status,
                    summary.CreatedAt,
                    summary.Tags,
                    summary.LikeCount,
                    summary.IsLikedByCurrentUser);
            }).ToList();
        }

        private static IQueryable<ReviewSummaryProjection> ProjectSummaryData(IQueryable<Review> source, string? currentUserId) =>
            source.Select(review => new ReviewSummaryProjection(
                review.Id,
                review.SubjectId,
                review.Subject != null ? review.Subject.Name : null,
                review.UserId,
                review.User != null ? review.User.UserName : null,
                review.User != null ? review.User.DisplayName : null,
                review.User != null ? review.User.AvatarUrl : null,
                review.Title,
                review.Content,
                review.Excerpt,
                review.Ratings.Select(r => new ReviewRatingDto(r.Key, r.Score, r.Label)).ToList(),
                review.Status,
                review.CreatedAt,
                review.Tags.Select(tag => tag.Value).ToList(),
                review.Likes.Count,
                currentUserId != null && review.Likes.Any(like => like.UserId == currentUserId)));

        private static async Task<ReviewSummaryDto?> FetchSingleSummaryAsync(ApplicationDbContext db, long reviewId, string? currentUserId, CancellationToken cancellationToken)
        {
            var summaries = await FetchSummariesAsync(db.Reviews.AsNoTracking().Where(r => r.Id == reviewId), currentUserId, cancellationToken);
            return summaries.FirstOrDefault();
        }

        private static string? NormalizeExcerpt(string? excerpt)
        {
            if (string.IsNullOrWhiteSpace(excerpt))
            {
                return null;
            }

            var trimmed = excerpt.Trim();
            return trimmed.Length > MaxExcerptLength ? trimmed[..MaxExcerptLength] : trimmed;
        }

        private static (string? Value, bool IsAuto) ResolveExcerpt(string? storedExcerpt, string? content)
        {
            if (!string.IsNullOrEmpty(storedExcerpt))
            {
                return (storedExcerpt, false);
            }

            if (string.IsNullOrWhiteSpace(content))
            {
                return (null, true);
            }

            var trimmed = content.Trim();
            if (trimmed.Length == 0)
            {
                return (null, true);
            }

            var excerpt = trimmed.Length > AutoExcerptLength ? trimmed[..AutoExcerptLength] : trimmed;
            return (excerpt, true);
        }

        private static async Task<(int LikeCount, bool IsLikedByCurrentUser)> GetLikeStateAsync(ApplicationDbContext db, long reviewId, string? currentUserId, CancellationToken cancellationToken)
        {
            var likeState = await db.ReviewLikes
                .Where(like => like.ReviewId == reviewId)
                .GroupBy(_ => 1)
                .Select(group => new
                {
                    Count = group.Count(),
                    IsLiked = currentUserId != null && group.Any(like => like.UserId == currentUserId)
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (likeState is null)
            {
                return (0, false);
            }

            return (likeState.Count, likeState.IsLiked);
        }

        private record ReviewSummaryProjection(
            long Id,
            int SubjectId,
            string? SubjectName,
            string UserId,
            string? AuthorUserName,
            string? AuthorDisplayName,
            string? AuthorAvatarUrl,
            string? Title,
            string? Content,
            string? Excerpt,
            IReadOnlyList<ReviewRatingDto> Ratings,
            ReviewStatus Status,
            DateTime CreatedAt,
            IReadOnlyList<string> Tags,
            int LikeCount,
            bool IsLikedByCurrentUser);

        private record ReviewSummaryDto(
            long Id,
            int SubjectId,
            string? SubjectName,
            string UserId,
            string? AuthorUserName,
            string? AuthorDisplayName,
            string? AuthorAvatarUrl,
            string? Title,
            string? Content,
            string? Excerpt,
            bool ExcerptIsAuto,
            IReadOnlyList<ReviewRatingDto> Ratings,
            ReviewStatus Status,
            DateTime CreatedAt,
            IReadOnlyList<string> Tags,
            int LikeCount,
            bool IsLikedByCurrentUser);
        internal record UpdateReviewDto(string Title, string? Content, string? Excerpt, IReadOnlyList<ReviewRatingDto>? Ratings, IReadOnlyList<string>? Tags);
        private record ReviewDetailDto(
            long Id,
            int SubjectId,
            string? SubjectName,
            string? SubjectSlug,
            string UserId,
            string? AuthorUserName,
            string? AuthorDisplayName,
            string? AuthorAvatarUrl,
            string? Title,
            string? Content,
            string? Excerpt,
            bool ExcerptIsAuto,
            IReadOnlyList<string> Tags,
            IReadOnlyList<ReviewRatingDto> Ratings,
            int LikeCount,
            bool IsLikedByCurrentUser,
            ReviewStatus Status,
            DateTime CreatedAt,
            DateTime UpdatedAt,
            IReadOnlyList<ReviewMediaDto> Media);
        private record ReviewMediaDto(long Id, string Url, MediaType Type, IReadOnlyList<ReviewMediaMetadataDto> Metadata);
        private record ReviewMediaMetadataDto(string Key, string? Value, string? Note);
        internal record ReviewRatingDto(string Key, decimal Score, string? Label);
        private record ReviewDeleteResultDto(long Id, bool Deleted);
        private record ReviewLikeResultDto(long ReviewId, int LikeCount, bool IsLikedByCurrentUser);
    }
}
