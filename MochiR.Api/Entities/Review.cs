using System.Text.Json;

namespace MochiR.Api.Entities
{
    public enum ReviewStatus
    {
        Pending = 0,
        Approved = 1,
        Rejected = 2,
        Flagged = 3
    }

    public class Review
    {
        public long Id { get; set; }

        public int SubjectId { get; set; }
        public Subject? Subject { get; set; }

        public required string UserId { get; set; }
        public ApplicationUser? User { get; set; }

        public string? Title { get; set; }
        public string? Content { get; set; }

        // JSON ratings map, e.g., { "overall":4.5, "taste":4 }
        public JsonDocument? Ratings { get; set; }

        public int MediaCount { get; set; }

        public ReviewStatus Status { get; set; } = ReviewStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public bool IsDeleted { get; set; }

        public ICollection<ReviewMedia> Media { get; set; } = new List<ReviewMedia>();
    }
}
