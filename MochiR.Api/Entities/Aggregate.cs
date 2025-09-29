using System.Text.Json;

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

        // JSON breakdown: per-criteria averages/medians/distributions
        public JsonDocument? Breakdown { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Optional navigation
        public Subject? Subject { get; set; }
    }
}
