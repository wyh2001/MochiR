using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MochiR.Api.Dtos;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using MochiR.Api.Infrastructure.Validation;

namespace MochiR.Api.Endpoints
{
    public static partial class FollowsEndpoints
    {
        private const int DefaultPageSize = 20;
        private const int MaxPageSize = 100;

        public static void MapFollowsEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/follows")
                .WithTags("Follows")
                .RequireAuthorization();

            MapSubjectFollows(group);
            MapSubjectTypeFollows(group);
            MapUserFollows(group);
        }

        private static void MapSubjectFollows(RouteGroupBuilder group)
        {
            group.MapPost("/subjects/{subjectId:int}", async (
                int subjectId,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                if (subjectId <= 0)
                {
                    return ApiResults.Failure(
                        "FOLLOW_INVALID_TARGET",
                        "SubjectId must be positive.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                var userId = userManager.GetUserId(httpContext.User);
                if (string.IsNullOrEmpty(userId))
                {
                    return ApiResults.Failure(
                        "AUTH_UNAUTHORIZED",
                        "User is not authenticated.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                var subject = await db.Subjects
                    .AsNoTracking()
                    .Where(s => s.Id == subjectId && !s.IsDeleted)
                    .Select(s => new { s.Id, s.Name, s.Slug })
                    .FirstOrDefaultAsync(cancellationToken);

                if (subject is null)
                {
                    return ApiResults.Failure(
                        "FOLLOW_TARGET_NOT_FOUND",
                        "Subject not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                var exists = await db.Follows
                    .AsNoTracking()
                    .AnyAsync(f =>
                        f.FollowerId == userId &&
                        f.TargetType == FollowTargetType.Subject &&
                        f.SubjectId == subjectId,
                        cancellationToken);

                if (exists)
                {
                    return ApiResults.Failure(
                        "FOLLOW_ALREADY_EXISTS",
                        "Follow already exists.",
                        httpContext,
                        StatusCodes.Status409Conflict);
                }

                var follow = new Follow
                {
                    FollowerId = userId,
                    TargetType = FollowTargetType.Subject,
                    SubjectId = subjectId,
                    SubjectTypeId = null,
                    FollowedUserId = null,
                    CreatedAtUtc = DateTime.UtcNow
                };

                db.Follows.Add(follow);
                await db.SaveChangesAsync(cancellationToken);

                var payload = new FollowSubjectSummaryDto(
                    follow.Id,
                    subject.Id,
                    subject.Name,
                    subject.Slug,
                    follow.CreatedAtUtc);

                return ApiResults.Created($"/api/follows/subjects/{subject.Id}", payload, httpContext);
            })
            .Produces<ApiResponse<FollowSubjectSummaryDto>>(StatusCodes.Status201Created)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .Produces<ApiResponse<object>>(StatusCodes.Status401Unauthorized)
            .Produces<ApiResponse<object>>(StatusCodes.Status404NotFound)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict)
            .WithSummary("Follow a subject.")
            .WithDescription("POST /api/follows/subjects/{subjectId}. Requires authentication. Path parameter subjectId must reference an existing subject. Returns 201 with follow details, or 400/401/404/409 when validation fails.")
            .RequireAuthorization()
            .WithOpenApi();

            group.MapDelete("/subjects/{subjectId:int}", async (
                int subjectId,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                if (subjectId <= 0)
                {
                    return ApiResults.Failure(
                        "FOLLOW_INVALID_TARGET",
                        "SubjectId must be positive.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                var userId = userManager.GetUserId(httpContext.User);
                if (string.IsNullOrEmpty(userId))
                {
                    return ApiResults.Failure(
                        "AUTH_UNAUTHORIZED",
                        "User is not authenticated.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                var follow = await db.Follows
                    .FirstOrDefaultAsync(f =>
                        f.FollowerId == userId &&
                        f.TargetType == FollowTargetType.Subject &&
                        f.SubjectId == subjectId,
                        cancellationToken);

                if (follow is null)
                {
                    return ApiResults.Failure(
                        "FOLLOW_NOT_FOUND",
                        "Follow not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                db.Follows.Remove(follow);
                await db.SaveChangesAsync(cancellationToken);

                return ApiResults.Ok(new FollowDeletionResultDto(follow.Id, true), httpContext);
            })
            .Produces<ApiResponse<FollowDeletionResultDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .Produces<ApiResponse<object>>(StatusCodes.Status401Unauthorized)
            .Produces<ApiResponse<object>>(StatusCodes.Status404NotFound)
            .WithSummary("Unfollow a subject.")
            .WithDescription("DELETE /api/follows/subjects/{subjectId}. Requires authentication. Removes the follow relationship and returns 200 with a removal flag, or 400/401/404 when the request cannot be completed.")
            .RequireAuthorization()
            .WithOpenApi();

            group.MapGet("/subjects", async (
                [AsParameters] FollowListQueryDto query,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                var userId = userManager.GetUserId(httpContext.User);
                if (string.IsNullOrEmpty(userId))
                {
                    return ApiResults.Failure(
                        "AUTH_UNAUTHORIZED",
                        "User is not authenticated.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                var (page, size) = NormalizePagination(query.Page, query.PageSize);

                var baseQuery = db.Follows
                    .AsNoTracking()
                    .Where(f =>
                        f.FollowerId == userId &&
                        f.TargetType == FollowTargetType.Subject &&
                        f.SubjectId != null &&
                        f.Subject != null &&
                        !f.Subject.IsDeleted);

                var total = await baseQuery.CountAsync(cancellationToken);

                var items = await baseQuery
                    .OrderByDescending(f => f.CreatedAtUtc)
                    .Skip((page - 1) * size)
                    .Take(size)
                    .Select(f => new FollowSubjectSummaryDto(
                        f.Id,
                        f.SubjectId!.Value,
                        f.Subject!.Name,
                        f.Subject!.Slug,
                        f.CreatedAtUtc))
                    .ToListAsync(cancellationToken);

                var payload = new FollowSubjectPageDto(total, page, size, items);
                return ApiResults.Ok(payload, httpContext);
            })
            .Produces<ApiResponse<FollowSubjectPageDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .Produces<ApiResponse<object>>(StatusCodes.Status401Unauthorized)
            .WithSummary("List followed subjects.")
            .WithDescription("GET /api/follows/subjects. Requires authentication. Supports page and pageSize query parameters and returns a paginated collection ordered by follow time. Responds with 400 for invalid pagination or 401 when unauthenticated.")
            .AddValidation<FollowListQueryDto>(
                "FOLLOW_INVALID_QUERY",
                "Page and PageSize must be positive.")
            .RequireAuthorization()
            .WithOpenApi();
        }

        private static void MapSubjectTypeFollows(RouteGroupBuilder group)
        {
            group.MapPost("/subject-types/{subjectTypeId:int}", async (
                int subjectTypeId,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                if (subjectTypeId <= 0)
                {
                    return ApiResults.Failure(
                        "FOLLOW_INVALID_TARGET",
                        "SubjectTypeId must be positive.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                var userId = userManager.GetUserId(httpContext.User);
                if (string.IsNullOrEmpty(userId))
                {
                    return ApiResults.Failure(
                        "AUTH_UNAUTHORIZED",
                        "User is not authenticated.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                var subjectType = await db.SubjectTypes
                    .AsNoTracking()
                    .Where(st => st.Id == subjectTypeId)
                    .Select(st => new { st.Id, st.Key, st.DisplayName })
                    .FirstOrDefaultAsync(cancellationToken);

                if (subjectType is null)
                {
                    return ApiResults.Failure(
                        "FOLLOW_TARGET_NOT_FOUND",
                        "Subject type not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                var exists = await db.Follows
                    .AsNoTracking()
                    .AnyAsync(f =>
                        f.FollowerId == userId &&
                        f.TargetType == FollowTargetType.SubjectType &&
                        f.SubjectTypeId == subjectTypeId,
                        cancellationToken);

                if (exists)
                {
                    return ApiResults.Failure(
                        "FOLLOW_ALREADY_EXISTS",
                        "Follow already exists.",
                        httpContext,
                        StatusCodes.Status409Conflict);
                }

                var follow = new Follow
                {
                    FollowerId = userId,
                    TargetType = FollowTargetType.SubjectType,
                    SubjectId = null,
                    SubjectTypeId = subjectTypeId,
                    FollowedUserId = null,
                    CreatedAtUtc = DateTime.UtcNow
                };

                db.Follows.Add(follow);
                await db.SaveChangesAsync(cancellationToken);

                var payload = new FollowSubjectTypeSummaryDto(
                    follow.Id,
                    subjectType.Id,
                    subjectType.Key,
                    subjectType.DisplayName,
                    follow.CreatedAtUtc);

                return ApiResults.Created($"/api/follows/subject-types/{subjectType.Id}", payload, httpContext);
            })
            .Produces<ApiResponse<FollowSubjectTypeSummaryDto>>(StatusCodes.Status201Created)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .Produces<ApiResponse<object>>(StatusCodes.Status401Unauthorized)
            .Produces<ApiResponse<object>>(StatusCodes.Status404NotFound)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict)
            .WithSummary("Follow a subject type.")
            .WithDescription("POST /api/follows/subject-types/{subjectTypeId}. Requires authentication. Path parameter subjectTypeId must reference an existing type. Returns 201 with follow details, or 400/401/404/409 when validation fails.")
            .RequireAuthorization()
            .WithOpenApi();

            group.MapDelete("/subject-types/{subjectTypeId:int}", async (
                int subjectTypeId,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                if (subjectTypeId <= 0)
                {
                    return ApiResults.Failure(
                        "FOLLOW_INVALID_TARGET",
                        "SubjectTypeId must be positive.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                var userId = userManager.GetUserId(httpContext.User);
                if (string.IsNullOrEmpty(userId))
                {
                    return ApiResults.Failure(
                        "AUTH_UNAUTHORIZED",
                        "User is not authenticated.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                var follow = await db.Follows
                    .FirstOrDefaultAsync(f =>
                        f.FollowerId == userId &&
                        f.TargetType == FollowTargetType.SubjectType &&
                        f.SubjectTypeId == subjectTypeId,
                        cancellationToken);

                if (follow is null)
                {
                    return ApiResults.Failure(
                        "FOLLOW_NOT_FOUND",
                        "Follow not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                db.Follows.Remove(follow);
                await db.SaveChangesAsync(cancellationToken);

                return ApiResults.Ok(new FollowDeletionResultDto(follow.Id, true), httpContext);
            })
            .Produces<ApiResponse<FollowDeletionResultDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .Produces<ApiResponse<object>>(StatusCodes.Status401Unauthorized)
            .Produces<ApiResponse<object>>(StatusCodes.Status404NotFound)
            .WithSummary("Unfollow a subject type.")
            .WithDescription("DELETE /api/follows/subject-types/{subjectTypeId}. Requires authentication. Removes the follow relationship and returns 200 with a removal flag, or 400/401/404 when the request cannot be completed.")
            .RequireAuthorization()
            .WithOpenApi();

            group.MapGet("/subject-types", async (
                [AsParameters] FollowListQueryDto query,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                var userId = userManager.GetUserId(httpContext.User);
                if (string.IsNullOrEmpty(userId))
                {
                    return ApiResults.Failure(
                        "AUTH_UNAUTHORIZED",
                        "User is not authenticated.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                var (page, size) = NormalizePagination(query.Page, query.PageSize);

                var baseQuery = db.Follows
                    .AsNoTracking()
                    .Where(f =>
                        f.FollowerId == userId &&
                        f.TargetType == FollowTargetType.SubjectType &&
                        f.SubjectTypeId != null &&
                        f.SubjectType != null);

                var total = await baseQuery.CountAsync(cancellationToken);

                var items = await baseQuery
                    .OrderByDescending(f => f.CreatedAtUtc)
                    .Skip((page - 1) * size)
                    .Take(size)
                    .Select(f => new FollowSubjectTypeSummaryDto(
                        f.Id,
                        f.SubjectTypeId!.Value,
                        f.SubjectType!.Key,
                        f.SubjectType!.DisplayName,
                        f.CreatedAtUtc))
                    .ToListAsync(cancellationToken);

                var payload = new FollowSubjectTypePageDto(total, page, size, items);
                return ApiResults.Ok(payload, httpContext);
            })
            .Produces<ApiResponse<FollowSubjectTypePageDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .Produces<ApiResponse<object>>(StatusCodes.Status401Unauthorized)
            .WithSummary("List followed subject types.")
            .WithDescription("GET /api/follows/subject-types. Requires authentication. Supports page and pageSize query parameters and returns a paginated collection with subject type metadata. Responds with 400 for invalid pagination or 401 when unauthenticated.")
            .AddValidation<FollowListQueryDto>(
                "FOLLOW_INVALID_QUERY",
                "Page and PageSize must be positive.")
            .RequireAuthorization()
            .WithOpenApi();
        }

        private static void MapUserFollows(RouteGroupBuilder group)
        {
            group.MapPost("/users/{followedUserId}", async (
                string followedUserId,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                if (string.IsNullOrWhiteSpace(followedUserId))
                {
                    return ApiResults.Failure(
                        "FOLLOW_INVALID_TARGET",
                        "FollowedUserId is required.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                var userId = userManager.GetUserId(httpContext.User);
                if (string.IsNullOrEmpty(userId))
                {
                    return ApiResults.Failure(
                        "AUTH_UNAUTHORIZED",
                        "User is not authenticated.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                if (string.Equals(userId, followedUserId, StringComparison.Ordinal))
                {
                    return ApiResults.Failure(
                        "FOLLOW_SELF_FORBIDDEN",
                        "You cannot follow yourself.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                var targetUser = await userManager.Users
                    .AsNoTracking()
                    .Where(u => u.Id == followedUserId && !u.IsDeleted)
                    .Select(u => new { u.Id, u.UserName, u.DisplayName, u.AvatarUrl })
                    .FirstOrDefaultAsync(cancellationToken);

                if (targetUser is null)
                {
                    return ApiResults.Failure(
                        "FOLLOW_TARGET_NOT_FOUND",
                        "Target user not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                var exists = await db.Follows
                    .AsNoTracking()
                    .AnyAsync(f =>
                        f.FollowerId == userId &&
                        f.TargetType == FollowTargetType.User &&
                        f.FollowedUserId == followedUserId,
                        cancellationToken);

                if (exists)
                {
                    return ApiResults.Failure(
                        "FOLLOW_ALREADY_EXISTS",
                        "Follow already exists.",
                        httpContext,
                        StatusCodes.Status409Conflict);
                }

                var follow = new Follow
                {
                    FollowerId = userId,
                    TargetType = FollowTargetType.User,
                    SubjectId = null,
                    SubjectTypeId = null,
                    FollowedUserId = followedUserId,
                    CreatedAtUtc = DateTime.UtcNow
                };

                db.Follows.Add(follow);
                var follower = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
                var followed = await db.Users.FirstOrDefaultAsync(u => u.Id == followedUserId, cancellationToken);

                if (follower is not null)
                {
                    follower.FollowingCount += 1;
                }

                if (followed is not null)
                {
                    followed.FollowersCount += 1;
                }

                await db.SaveChangesAsync(cancellationToken);

                var payload = new FollowUserSummaryDto(
                    follow.Id,
                    targetUser.Id,
                    targetUser.UserName,
                    targetUser.DisplayName,
                    targetUser.AvatarUrl,
                    follow.CreatedAtUtc);

                return ApiResults.Created($"/api/follows/users/{targetUser.Id}", payload, httpContext);
            })
            .Produces<ApiResponse<FollowUserSummaryDto>>(StatusCodes.Status201Created)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .Produces<ApiResponse<object>>(StatusCodes.Status401Unauthorized)
            .Produces<ApiResponse<object>>(StatusCodes.Status404NotFound)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict)
            .WithSummary("Follow a user.")
            .WithDescription("POST /api/follows/users/{followedUserId}. Requires authentication. Path parameter followedUserId must reference another existing user. Returns 201 with follow details, or 400/401/404/409 when validation fails (including self-follow attempts).")
            .RequireAuthorization()
            .WithOpenApi();

            group.MapDelete("/users/{followedUserId}", async (
                string followedUserId,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                if (string.IsNullOrWhiteSpace(followedUserId))
                {
                    return ApiResults.Failure(
                        "FOLLOW_INVALID_TARGET",
                        "FollowedUserId is required.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                var userId = userManager.GetUserId(httpContext.User);
                if (string.IsNullOrEmpty(userId))
                {
                    return ApiResults.Failure(
                        "AUTH_UNAUTHORIZED",
                        "User is not authenticated.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                var follow = await db.Follows
                    .FirstOrDefaultAsync(f =>
                        f.FollowerId == userId &&
                        f.TargetType == FollowTargetType.User &&
                        f.FollowedUserId == followedUserId,
                        cancellationToken);

                if (follow is null)
                {
                    return ApiResults.Failure(
                        "FOLLOW_NOT_FOUND",
                        "Follow not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                db.Follows.Remove(follow);
                var follower = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
                var followed = await db.Users.FirstOrDefaultAsync(u => u.Id == followedUserId, cancellationToken);

                if (follower is not null && follower.FollowingCount > 0)
                {
                    follower.FollowingCount -= 1;
                }

                if (followed is not null && followed.FollowersCount > 0)
                {
                    followed.FollowersCount -= 1;
                }

                await db.SaveChangesAsync(cancellationToken);

                return ApiResults.Ok(new FollowDeletionResultDto(follow.Id, true), httpContext);
            })
            .Produces<ApiResponse<FollowDeletionResultDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .Produces<ApiResponse<object>>(StatusCodes.Status401Unauthorized)
            .Produces<ApiResponse<object>>(StatusCodes.Status404NotFound)
            .WithSummary("Unfollow a user.")
            .WithDescription("DELETE /api/follows/users/{followedUserId}. Requires authentication. Removes the follow relationship and returns 200 with a removal flag, or 400/401/404 when the request cannot be completed.")
            .RequireAuthorization()
            .WithOpenApi();

            group.MapGet("/users", async (
                [AsParameters] FollowListQueryDto query,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                var userId = userManager.GetUserId(httpContext.User);
                if (string.IsNullOrEmpty(userId))
                {
                    return ApiResults.Failure(
                        "AUTH_UNAUTHORIZED",
                        "User is not authenticated.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                var (page, size) = NormalizePagination(query.Page, query.PageSize);

                var baseQuery = db.Follows
                    .AsNoTracking()
                    .Where(f =>
                        f.FollowerId == userId &&
                        f.TargetType == FollowTargetType.User &&
                        f.FollowedUserId != null &&
                        f.FollowedUser != null &&
                        !f.FollowedUser.IsDeleted);

                var total = await baseQuery.CountAsync(cancellationToken);

                var items = await baseQuery
                    .OrderByDescending(f => f.CreatedAtUtc)
                    .Skip((page - 1) * size)
                    .Take(size)
                    .Select(f => new FollowUserSummaryDto(
                        f.Id,
                        f.FollowedUserId!,
                        f.FollowedUser!.UserName,
                        f.FollowedUser!.DisplayName,
                        f.FollowedUser!.AvatarUrl,
                        f.CreatedAtUtc))
                    .ToListAsync(cancellationToken);

                var payload = new FollowUserPageDto(total, page, size, items);
                return ApiResults.Ok(payload, httpContext);
            })
            .Produces<ApiResponse<FollowUserPageDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .Produces<ApiResponse<object>>(StatusCodes.Status401Unauthorized)
            .WithSummary("List followed users.")
            .WithDescription("GET /api/follows/users. Requires authentication. Supports page and pageSize query parameters and returns a paginated collection enriched with followed user profile data. Responds with 400 for invalid pagination or 401 when unauthenticated.")
            .AddValidation<FollowListQueryDto>(
                "FOLLOW_INVALID_QUERY",
                "Page and PageSize must be positive.")
            .RequireAuthorization()
            .WithOpenApi();
        }

        private static (int Page, int Size) NormalizePagination(int? page, int? pageSize)
        {
            var pageNumber = page.HasValue && page.Value > 0 ? page.Value : 1;
            var size = pageSize.HasValue && pageSize.Value > 0 ? Math.Min(pageSize.Value, MaxPageSize) : DefaultPageSize;
            return (pageNumber, size);
        }

        private record FollowSubjectSummaryDto(long FollowId, int SubjectId, string SubjectName, string SubjectSlug, DateTime FollowedAtUtc);
        private record FollowSubjectPageDto(int TotalCount, int Page, int PageSize, IReadOnlyCollection<FollowSubjectSummaryDto> Items);
        private record FollowSubjectTypeSummaryDto(long FollowId, int SubjectTypeId, string SubjectTypeKey, string SubjectTypeDisplayName, DateTime FollowedAtUtc);
        private record FollowSubjectTypePageDto(int TotalCount, int Page, int PageSize, IReadOnlyCollection<FollowSubjectTypeSummaryDto> Items);
        private record FollowUserSummaryDto(long FollowId, string UserId, string? UserName, string? DisplayName, string? AvatarUrl, DateTime FollowedAtUtc);
        private record FollowUserPageDto(int TotalCount, int Page, int PageSize, IReadOnlyCollection<FollowUserSummaryDto> Items);
        private record FollowDeletionResultDto(long FollowId, bool Removed);
    }

    internal sealed record FollowListQueryDto
    {
        public int? Page { get; init; }
        public int? PageSize { get; init; }
    }
}
