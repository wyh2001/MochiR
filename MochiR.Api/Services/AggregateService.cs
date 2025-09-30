using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Api.Services
{
    public static class AggregateService
    {
        public static async Task UpdateSubjectAggregateAsync(ApplicationDbContext db, int subjectId, CancellationToken cancellationToken)
        {
            var reviews = await db.Reviews
                .AsNoTracking()
                .Where(r => r.SubjectId == subjectId && !r.IsDeleted)
                .ToListAsync(cancellationToken);

            var aggregate = await db.Aggregates.FirstOrDefaultAsync(a => a.SubjectId == subjectId, cancellationToken);

            if (reviews.Count == 0)
            {
                if (aggregate is not null)
                {
                    db.Aggregates.Remove(aggregate);
                    await db.SaveChangesAsync(cancellationToken);
                }

                return;
            }

            decimal overallSum = 0m;
            int overallCount = 0;

            foreach (var review in reviews)
            {
                if (review.Ratings is null)
                {
                    continue;
                }

                if (review.Ratings.RootElement.TryGetProperty("overall", out var overallElement))
                {
                    if (overallElement.TryGetDecimal(out var value))
                    {
                        overallSum += value;
                        overallCount++;
                    }
                }
            }

            decimal averageOverall = overallCount > 0
                ? Math.Round(overallSum / overallCount, 2, MidpointRounding.AwayFromZero)
                : 0m;

            var breakdownPayload = new
            {
                overallAverage = averageOverall,
                overallCount
            };

            JsonDocument breakdownDocument = JsonSerializer.SerializeToDocument(breakdownPayload);

            if (aggregate is null)
            {
                aggregate = new Aggregate
                {
                    SubjectId = subjectId
                };
                db.Aggregates.Add(aggregate);
            }

            aggregate.CountReviews = reviews.Count;
            aggregate.AvgOverall = averageOverall;
            aggregate.Breakdown = breakdownDocument;
            aggregate.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
