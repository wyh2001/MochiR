using Microsoft.EntityFrameworkCore;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using MochiR.Api.Infrastructure.Validation;

namespace MochiR.Api.Endpoints
{
    public static partial class RatingsEndpoints
    {
        public static void MapRatingsEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/ratings").WithTags("Ratings");

            // Get aggregate ratings for a subject
            group.MapGet("/subjects/{subjectId:int}", async (
                int subjectId, ApplicationDbContext db,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                var aggregate = await db.Aggregates
                    .AsNoTracking()
                    .FirstOrDefaultAsync(a => a.SubjectId == subjectId, cancellationToken);

                if (aggregate is null)
                {
                    return ApiResults.Failure(
                        "RATINGS_SUBJECT_NOT_FOUND",
                        "Aggregate for the specified subject was not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                var payload = new SubjectAggregateDto(
                    aggregate.SubjectId,
                    aggregate.CountReviews,
                    aggregate.AvgOverall,
                    aggregate.Metrics.Select(m => new AggregateMetricDto(m.Key, m.Value, m.Count, m.Note)).ToList(),
                    aggregate.UpdatedAt);

                return ApiResults.Ok(payload, httpContext);
            }).WithOpenApi();

            // Upsert aggregate ratings for a subject, usually called by internal services
            group.MapPost("/subjects/{subjectId:int}", async (
                int subjectId,
                UpsertAggregateDto dto,
                ApplicationDbContext db,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                var subjectExists = await db.Subjects.AnyAsync(s => s.Id == subjectId, cancellationToken);
                if (!subjectExists)
                {
                    return ApiResults.Failure(
                        "RATINGS_SUBJECT_NOT_FOUND",
                        "Subject not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                var aggregate = await db.Aggregates.FirstOrDefaultAsync(a => a.SubjectId == subjectId, cancellationToken);

                if (aggregate is null)
                {
                    aggregate = new Aggregate
                    {
                        SubjectId = subjectId,
                        CountReviews = dto.CountReviews,
                        AvgOverall = dto.AvgOverall,
                        Metrics = dto.Metrics?.Select(m => new AggregateMetric
                        {
                            Key = m.Key,
                            Value = m.Value,
                            Count = m.Count,
                            Note = m.Note
                        })?.ToList() ?? new List<AggregateMetric>(),
                        UpdatedAt = DateTime.UtcNow
                    };
                    db.Aggregates.Add(aggregate);
                }
                else
                {
                    aggregate.CountReviews = dto.CountReviews;
                    aggregate.AvgOverall = dto.AvgOverall;
                    aggregate.Metrics = dto.Metrics?.Select(m => new AggregateMetric
                    {
                        Key = m.Key,
                        Value = m.Value,
                        Count = m.Count,
                        Note = m.Note
                    })?.ToList() ?? new List<AggregateMetric>();
                    aggregate.UpdatedAt = DateTime.UtcNow;
                }

                await db.SaveChangesAsync(cancellationToken);

                var payload = new SubjectAggregateDto(
                    aggregate.SubjectId,
                    aggregate.CountReviews,
                    aggregate.AvgOverall,
                    aggregate.Metrics.Select(m => new AggregateMetricDto(m.Key, m.Value, m.Count, m.Note)).ToList(),
                    aggregate.UpdatedAt);

                return ApiResults.Ok(payload, httpContext);
            })
            .AddValidation<UpsertAggregateDto>(
                "RATINGS_INVALID_PAYLOAD",
                "Aggregate payload is invalid.")
            .RequireAuthorization(policy => policy.RequireRole(AppRoles.Admin)).WithOpenApi();
        }

        private record SubjectAggregateDto(int SubjectId, int CountReviews, decimal AvgOverall, IReadOnlyList<AggregateMetricDto> Metrics, DateTime UpdatedAt);
        internal record UpsertAggregateDto(int CountReviews, decimal AvgOverall, IReadOnlyList<AggregateMetricDto>? Metrics);
        internal record AggregateMetricDto(string Key, decimal? Value, int? Count, string? Note);
    }
}
