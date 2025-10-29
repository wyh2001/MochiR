using Microsoft.EntityFrameworkCore;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Api.Services
{
    public static class AggregateService
    {
        public static async Task UpdateSubjectAggregateAsync(
            ApplicationDbContext db, int subjectId,
            CancellationToken cancellationToken)
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

            var metricGroups = reviews
                .SelectMany(r => r.Ratings)
                .GroupBy(r => r.Key, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(
                    g => g.Key,
                    g => new
                    {
                        Average = Math.Round(g.Average(x => x.Score), 2, MidpointRounding.AwayFromZero),
                        Count = g.Count()
                    },
                    StringComparer.OrdinalIgnoreCase);

            decimal averageOverall = metricGroups.TryGetValue("overall", out var overall) // TBD: magic string here, should be configurable
                ? overall.Average
                : 0m;

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
            aggregate.Metrics = metricGroups.Select(kv => new AggregateMetric
            {
                Key = kv.Key,
                Value = kv.Value.Average,
                Count = kv.Value.Count
            }).ToList();
            aggregate.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
