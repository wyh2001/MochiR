using MochiR.Api.Entities;

namespace MochiR.Api.Services.Reviews;

public static class ReviewQueryExtensions
{
    public static IQueryable<Review> WherePublic(this IQueryable<Review> reviews) =>
        reviews.Where(review => !review.IsDeleted && review.Status == ReviewStatus.Approved);

    public static IQueryable<Review> WhereVisibleTo(this IQueryable<Review> reviews, string? userId, bool isAdmin) =>
        reviews.Where(review => !review.IsDeleted &&
            (review.Status == ReviewStatus.Approved || isAdmin ||
             (userId != null && review.UserId == userId)));
}
