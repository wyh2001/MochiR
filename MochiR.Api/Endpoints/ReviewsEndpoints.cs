using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using MochiR.Api.Infrastructure.Validation;
using System.Security.Claims;

namespace MochiR.Api.Endpoints
{
    public static partial class ReviewsEndpoints
    {
        public static void MapReviewsEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/reviews").WithTags("Reviews");

            group.MapGet("/", async (int? subjectId, string? userId, ApplicationDbContext db, HttpContext httpContext, CancellationToken cancellationToken) =>
            {
                var query = db.Reviews
                    .AsNoTracking()
                    .Where(review => !review.IsDeleted)
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

                var reviews = await query.ToListAsync(cancellationToken);
                return ApiResults.Ok(reviews, httpContext);
            }).WithOpenApi();

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

                var review = new Review
                {
                    SubjectId = dto.SubjectId,
                    UserId = userId,
                    Title = dto.Title?.Trim(),
                    Content = dto.Content?.Trim(),
                    Ratings = dto.Ratings?.Select(r => new ReviewRating
                    {
                        Key = r.Key,
                        Score = r.Score,
                        Label = r.Label
                    })?.ToList() ?? new List<ReviewRating>(),
                    Status = ReviewStatus.Pending,
                    MediaCount = 0,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                db.Reviews.Add(review);
                await db.SaveChangesAsync(cancellationToken);

                var payload = new ReviewSummaryDto(
                    review.Id,
                    review.SubjectId,
                    review.UserId,
                    review.Title,
                    review.Content,
                    review.Status,
                    review.CreatedAt);

                return ApiResults.Created($"/api/reviews/{review.Id}", payload, httpContext);
            })
            .AddValidation<CreateReviewDto>(
                "REVIEW_INVALID_INPUT",
                "One or more fields are invalid.")
            .RequireAuthorization().WithOpenApi();

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
                review.Status = ReviewStatus.Pending;
                review.UpdatedAt = DateTime.UtcNow;

                await db.SaveChangesAsync(cancellationToken);

                var payload = new ReviewSummaryDto(
                    review.Id,
                    review.SubjectId,
                    review.UserId,
                    review.Title,
                    review.Content,
                    review.Status,
                    review.CreatedAt);

                return ApiResults.Ok(payload, httpContext);
            })
            .AddValidation<UpdateReviewDto>(
                "REVIEW_INVALID_INPUT",
                "One or more fields are invalid.")
            .RequireAuthorization().WithOpenApi();

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
            }).RequireAuthorization().WithOpenApi();

            group.MapGet("/{id:long}", async (long id, ApplicationDbContext db, HttpContext httpContext, CancellationToken cancellationToken) =>
            {
                var review = await db.Reviews
                    .AsNoTracking()
                    .Include(r => r.Subject)
                    .Include(r => r.User)
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

                var payload = new ReviewDetailDto(
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
                    media);

                return ApiResults.Ok(payload, httpContext);
            }).WithOpenApi();
        }

        internal record CreateReviewDto(int SubjectId, string? Title, string? Content, IReadOnlyList<ReviewRatingDto>? Ratings);
        private record ReviewSummaryDto(long Id, int SubjectId, string UserId, string? Title, string? Content, ReviewStatus Status, DateTime CreatedAt);
        internal record UpdateReviewDto(string Title, string? Content, IReadOnlyList<ReviewRatingDto>? Ratings);
        private record ReviewDetailDto(long Id, int SubjectId, string? SubjectName, string? SubjectSlug, string UserId, string? UserName, string? Title, string? Content, IReadOnlyList<ReviewRatingDto> Ratings, ReviewStatus Status, DateTime CreatedAt, DateTime UpdatedAt, IReadOnlyList<ReviewMediaDto> Media);
        private record ReviewMediaDto(long Id, string Url, MediaType Type, IReadOnlyList<ReviewMediaMetadataDto> Metadata);
        private record ReviewMediaMetadataDto(string Key, string? Value, string? Note);
        internal record ReviewRatingDto(string Key, decimal Score, string? Label);
        private record ReviewDeleteResultDto(long Id, bool Deleted);
    }
}
