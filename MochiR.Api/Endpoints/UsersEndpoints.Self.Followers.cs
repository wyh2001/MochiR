using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using MochiR.Api.Infrastructure.Validation;

namespace MochiR.Api.Endpoints
{
    public static partial class UsersEndpoints
    {
        static partial void MapSelfFollowEndpoints(RouteGroupBuilder selfGroup)
        {
            selfGroup.MapGet("/followers", async (
                [AsParameters] FollowListQueryDto query,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                var user = await GetCurrentUserAsync(userManager, httpContext);
                if (user is null)
                {
                    return SelfNotFound(httpContext);
                }

                var (page, size) = NormalizePagination(query.Page, query.PageSize);

                var baseQuery = db.Follows
                    .AsNoTracking()
                    .Where(f =>
                        f.TargetType == FollowTargetType.User &&
                        f.FollowedUserId == user.Id &&
                        f.Follower != null &&
                        !f.Follower.IsDeleted);

                var total = await baseQuery.CountAsync(cancellationToken);

                var items = await baseQuery
                    .OrderByDescending(f => f.CreatedAtUtc)
                    .Skip((page - 1) * size)
                    .Take(size)
                    .Select(f => new SelfFollowSummaryDto(
                        f.FollowerId,
                        f.Follower!.UserName,
                        f.Follower!.DisplayName,
                        f.Follower!.AvatarUrl,
                        f.CreatedAtUtc))
                    .ToListAsync(cancellationToken);

                var payload = new SelfFollowPageDto(total, page, size, items);
                return ApiResults.Ok(payload, httpContext);
            })
            .AddValidation<FollowListQueryDto>(
                "FOLLOW_INVALID_QUERY",
                "Page and PageSize must be positive.")
            .WithOpenApi();

            selfGroup.MapDelete("/followers/{userId}", async (
                string userId,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                if (string.IsNullOrWhiteSpace(userId))
                {
                    return ApiResults.Failure(
                        "FOLLOW_INVALID_TARGET",
                        "Target userId is required.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                var user = await GetCurrentUserAsync(userManager, httpContext);
                if (user is null)
                {
                    return SelfNotFound(httpContext);
                }

                if (string.Equals(user.Id, userId, StringComparison.Ordinal))
                {
                    return ApiResults.Failure(
                        "FOLLOW_NOT_FOUND",
                        "Follow not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                var follow = await db.Follows
                    .FirstOrDefaultAsync(f =>
                        f.TargetType == FollowTargetType.User &&
                        f.FollowerId == userId &&
                        f.FollowedUserId == user.Id,
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
                var currentUser = await db.Users.FirstOrDefaultAsync(u => u.Id == user.Id, cancellationToken);

                if (follower is not null && follower.FollowingCount > 0)
                {
                    follower.FollowingCount -= 1;
                }

                if (currentUser is not null && currentUser.FollowersCount > 0)
                {
                    currentUser.FollowersCount -= 1;
                }

                await db.SaveChangesAsync(cancellationToken);

                return ApiResults.Ok(new SelfFollowerRemovalResultDto(userId, true), httpContext);
            })
            .WithOpenApi();

            selfGroup.MapGet("/following", async (
                [AsParameters] FollowListQueryDto query,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                var user = await GetCurrentUserAsync(userManager, httpContext);
                if (user is null)
                {
                    return SelfNotFound(httpContext);
                }

                var (page, size) = NormalizePagination(query.Page, query.PageSize);

                var baseQuery = db.Follows
                    .AsNoTracking()
                    .Where(f =>
                        f.TargetType == FollowTargetType.User &&
                        f.FollowerId == user.Id &&
                        f.FollowedUserId != null &&
                        f.FollowedUser != null &&
                        !f.FollowedUser.IsDeleted);

                var total = await baseQuery.CountAsync(cancellationToken);

                var items = await baseQuery
                    .OrderByDescending(f => f.CreatedAtUtc)
                    .Skip((page - 1) * size)
                    .Take(size)
                    .Select(f => new SelfFollowSummaryDto(
                        f.FollowedUserId!,
                        f.FollowedUser!.UserName,
                        f.FollowedUser!.DisplayName,
                        f.FollowedUser!.AvatarUrl,
                        f.CreatedAtUtc))
                    .ToListAsync(cancellationToken);

                var payload = new SelfFollowPageDto(total, page, size, items);
                return ApiResults.Ok(payload, httpContext);
            })
            .AddValidation<FollowListQueryDto>(
                "FOLLOW_INVALID_QUERY",
                "Page and PageSize must be positive.")
            .WithOpenApi();
        }

        private record SelfFollowSummaryDto(string UserId, string? UserName, string? DisplayName, string? AvatarUrl, DateTime FollowedAtUtc);
        private record SelfFollowPageDto(int TotalCount, int Page, int PageSize, IReadOnlyCollection<SelfFollowSummaryDto> Items);
        private record SelfFollowerRemovalResultDto(string UserId, bool Removed);
    }
}
