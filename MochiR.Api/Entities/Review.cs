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
        public string? Excerpt { get; set; }

        // Collection of per-criteria ratings, including overall
        public ICollection<ReviewRating> Ratings { get; set; } = new List<ReviewRating>();
        public ICollection<ReviewTag> Tags { get; set; } = new List<ReviewTag>();

        public int MediaCount { get; set; }

        public ReviewStatus Status { get; set; } = ReviewStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public bool IsDeleted { get; set; }

        public ICollection<ReviewMedia> Media { get; set; } = new List<ReviewMedia>();
    }

    public class ReviewRating
    {
        public string Key { get; set; } = string.Empty;
        public decimal Score { get; set; }
        public string? Label { get; set; }
    }

    public class ReviewTag
    {
        public string Value { get; set; } = string.Empty;
    }
}


