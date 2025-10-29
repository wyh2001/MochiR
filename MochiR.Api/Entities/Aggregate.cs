namespace MochiR.Api.Entities
{
    // Quick lookup aggregate for a Subject, updated on write or asynchronously
    public class Aggregate
    {
        // Primary Key and Foreign Key to Subject
        public int SubjectId { get; set; }

        public int CountReviews { get; set; }

        // Average of overall score (0-5). Using decimal for precision.
        public decimal AvgOverall { get; set; }

        // Breakdown metrics, e.g., per-criteria averages/medians/distributions
        public ICollection<AggregateMetric> Metrics { get; set; } = new List<AggregateMetric>();

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Optional navigation
        public Subject? Subject { get; set; }
    }

    public class AggregateMetric
    {
        public string Key { get; set; } = string.Empty;
        public decimal? Value { get; set; }
        public int? Count { get; set; }
        public string? Note { get; set; }
    }
}
