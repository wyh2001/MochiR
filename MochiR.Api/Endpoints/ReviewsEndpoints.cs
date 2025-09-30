using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using MochiR.Api.Services;
using System.Security.Claims;
using System.Text.Json;

namespace MochiR.Api.Endpoints
{
    public static class ReviewsEndpoints
    {
        public static void MapReviewsEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/reviews").WithTags("Reviews");

            group.MapGet("/", async (int? subjectId, string? userId, ApplicationDbContext db, CancellationToken cancellationToken) =>
            {
                var query = db.Reviews
                    .AsNoTracking()
                    .OrderByDescending(review => review.CreatedAt)
                    .Select(review => new ReviewSummaryDto(
                        review.Id,
                        review.SubjectId,
                        review.UserId,
                        review.Title,
                        review.Content,
                        review.Status,
                        review.CreatedAt));

                if (subjectId.HasValue)
                {
                    query = query.Where(review => review.SubjectId == subjectId.Value);
                }

                if (!string.IsNullOrWhiteSpace(userId))
                {
                    query = query.Where(review => review.UserId == userId);
                }

                return await query.ToListAsync(cancellationToken);
            }).WithOpenApi();

            group.MapPost("/", async (
                CreateReviewDto dto,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                ClaimsPrincipal user,
                CancellationToken cancellationToken) =>
            {
                var userId = userManager.GetUserId(user);
                if (string.IsNullOrEmpty(userId))
                {
                    return Results.Unauthorized();
                }

                var subjectExists = await db.Subjects.AnyAsync(subject => subject.Id == dto.SubjectId, cancellationToken);
                if (!subjectExists)
                {
                    return Results.BadRequest(new { message = "Subject does not exist." });
                }

                var duplicate = await db.Reviews.AnyAsync(review => review.SubjectId == dto.SubjectId && review.UserId == userId && !review.IsDeleted, cancellationToken);
                if (duplicate)
                {
                    return Results.Conflict(new { message = "You have already submitted a review for this subject." });
                }

                var review = new Review
                {
                    SubjectId = dto.SubjectId,
                    UserId = userId,
                    Title = dto.Title?.Trim(),
                    Content = dto.Content?.Trim(),
                    Ratings = dto.Ratings,
                    Status = ReviewStatus.Pending,
                    MediaCount = 0,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                db.Reviews.Add(review);
                await db.SaveChangesAsync(cancellationToken);

                await AggregateService.UpdateSubjectAggregateAsync(db, review.SubjectId, cancellationToken);

                return Results.Created($"/api/reviews/{review.Id}", new ReviewSummaryDto(
                    review.Id,
                    review.SubjectId,
                    review.UserId,
                    review.Title,
                    review.Content,
                    review.Status,
                    review.CreatedAt));
            }).RequireAuthorization().WithOpenApi();

            group.MapPut("/{id:long}", async (
                long id,
                UpdateReviewDto dto,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                ClaimsPrincipal user,
                CancellationToken cancellationToken) =>
            {
                var userId = userManager.GetUserId(user);
                if (string.IsNullOrEmpty(userId))
                {
                    return Results.Unauthorized();
                }

                if (string.IsNullOrWhiteSpace(dto.Title))
                {
                    return Results.BadRequest(new { message = "Title is required." });
                }

                var review = await db.Reviews.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
                if (review is null || review.IsDeleted)
                {
                    return Results.NotFound();
                }

                if (!string.Equals(review.UserId, userId, StringComparison.Ordinal))
                {
                    return Results.Forbid();
                }

                review.Title = dto.Title.Trim();
                review.Content = string.IsNullOrWhiteSpace(dto.Content) ? null : dto.Content.Trim();
                review.Ratings = dto.Ratings;
                review.Status = ReviewStatus.Pending;
                review.UpdatedAt = DateTime.UtcNow;

                await db.SaveChangesAsync(cancellationToken);

                await AggregateService.UpdateSubjectAggregateAsync(db, review.SubjectId, cancellationToken);

                return Results.Ok(new ReviewSummaryDto(
                    review.Id,
                    review.SubjectId,
                    review.UserId,
                    review.Title,
                    review.Content,
                    review.Status,
                    review.CreatedAt));
            }).RequireAuthorization().WithOpenApi();

            group.MapDelete("/{id:long}", async (
                long id,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                ClaimsPrincipal user,
                CancellationToken cancellationToken) =>
            {
                var userId = userManager.GetUserId(user);
                if (string.IsNullOrEmpty(userId))
                {
                    return Results.Unauthorized();
                }

                var review = await db.Reviews.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
                if (review is null || review.IsDeleted)
                {
                    return Results.NotFound();
                }

                if (!string.Equals(review.UserId, userId, StringComparison.Ordinal))
                {
                    return Results.Forbid();
                }

                review.IsDeleted = true;
                review.Status = ReviewStatus.Pending;
                review.UpdatedAt = DateTime.UtcNow;

                await db.SaveChangesAsync(cancellationToken);

                await AggregateService.UpdateSubjectAggregateAsync(db, review.SubjectId, cancellationToken);

                return Results.NoContent();
            }).RequireAuthorization().WithOpenApi();

            group.MapGet("/{id:long}", async (long id, ApplicationDbContext db, CancellationToken cancellationToken) =>
            {
                var review = await db.Reviews
                    .AsNoTracking()
                    .Include(r => r.Subject)
                    .Include(r => r.User)
                    .Include(r => r.Media)
                    .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

                if (review is null)
                {
                    return Results.NotFound();
                }

                JsonElement? ratings = review.Ratings?.RootElement.Clone();
                var media = review.Media
                    .Select(m => new ReviewMediaDto(m.Id, m.Url, m.Type, m.Metadata?.RootElement.Clone()))
                    .ToList();

                return Results.Ok(new ReviewDetailDto(
                    review.Id,
                    review.SubjectId,
                    review.Subject?.Name,
                    review.Subject?.Slug,
                    review.UserId,
                    review.User?.UserName,
                    review.Title,
                    review.Content,
                    ratings,
                    review.Status,
                    review.CreatedAt,
                    review.UpdatedAt,
                    media));
            }).WithOpenApi();
        }

        private record CreateReviewDto(int SubjectId, string? Title, string? Content, JsonDocument? Ratings);
        private record ReviewSummaryDto(long Id, int SubjectId, string UserId, string? Title, string? Content, ReviewStatus Status, DateTime CreatedAt);
        private record UpdateReviewDto(string Title, string? Content, JsonDocument? Ratings);
        private record ReviewDetailDto(long Id, int SubjectId, string? SubjectName, string? SubjectSlug, string UserId, string? UserName, string? Title, string? Content, JsonElement? Ratings, ReviewStatus Status, DateTime CreatedAt, DateTime UpdatedAt, IReadOnlyList<ReviewMediaDto> Media);
        private record ReviewMediaDto(long Id, string Url, MediaType Type, JsonElement? Metadata);
    }
}
