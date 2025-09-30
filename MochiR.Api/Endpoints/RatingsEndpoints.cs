using Microsoft.EntityFrameworkCore;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using System.Text.Json;

namespace MochiR.Api.Endpoints
{
    public static class RatingsEndpoints
    {
        public static void MapRatingsEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/ratings").WithTags("Ratings");

            group.MapGet("/subjects/{subjectId:int}", async (int subjectId, ApplicationDbContext db, CancellationToken cancellationToken) =>
            {
                var aggregate = await db.Aggregates
                    .AsNoTracking()
                    .FirstOrDefaultAsync(a => a.SubjectId == subjectId, cancellationToken);

                if (aggregate is null)
                {
                    return Results.NotFound();
                }

                JsonElement? breakdown = aggregate.Breakdown?.RootElement.Clone();

                return Results.Ok(new SubjectAggregateDto(
                    aggregate.SubjectId,
                    aggregate.CountReviews,
                    aggregate.AvgOverall,
                    breakdown,
                    aggregate.UpdatedAt));
            }).WithOpenApi();

            group.MapPost("/subjects/{subjectId:int}", async (
                int subjectId,
                UpsertAggregateDto dto,
                ApplicationDbContext db,
                CancellationToken cancellationToken) =>
            {
                var subjectExists = await db.Subjects.AnyAsync(s => s.Id == subjectId, cancellationToken);
                if (!subjectExists)
                {
                    return Results.NotFound();
                }

                if (dto.CountReviews < 0)
                {
                    return Results.BadRequest(new { message = "CountReviews cannot be negative." });
                }

                if (dto.AvgOverall < 0 || dto.AvgOverall > 5)
                {
                    return Results.BadRequest(new { message = "AvgOverall must be between 0 and 5." });
                }

                var aggregate = await db.Aggregates.FirstOrDefaultAsync(a => a.SubjectId == subjectId, cancellationToken);

                if (aggregate is null)
                {
                    aggregate = new Aggregate
                    {
                        SubjectId = subjectId,
                        CountReviews = dto.CountReviews,
                        AvgOverall = dto.AvgOverall,
                        Breakdown = dto.Breakdown,
                        UpdatedAt = DateTime.UtcNow
                    };
                    db.Aggregates.Add(aggregate);
                }
                else
                {
                    aggregate.CountReviews = dto.CountReviews;
                    aggregate.AvgOverall = dto.AvgOverall;
                    aggregate.Breakdown = dto.Breakdown;
                    aggregate.UpdatedAt = DateTime.UtcNow;
                }

                await db.SaveChangesAsync(cancellationToken);

                JsonElement? breakdown = aggregate.Breakdown?.RootElement.Clone();

                return Results.Ok(new SubjectAggregateDto(
                    aggregate.SubjectId,
                    aggregate.CountReviews,
                    aggregate.AvgOverall,
                    breakdown,
                    aggregate.UpdatedAt));
            }).WithOpenApi();
        }

        private record SubjectAggregateDto(int SubjectId, int CountReviews, decimal AvgOverall, JsonElement? Breakdown, DateTime UpdatedAt);
        private record UpsertAggregateDto(int CountReviews, decimal AvgOverall, JsonDocument? Breakdown);
    }
}
