namespace MochiR.Api.Entities
{
    public class ReviewLike
    {
        public long Id { get; set; }
        public long ReviewId { get; set; }
        public Review? Review { get; set; }
        public required string UserId { get; set; }
        public ApplicationUser? User { get; set; }
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
