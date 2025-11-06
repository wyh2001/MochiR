using System.ComponentModel.DataAnnotations.Schema;

namespace MochiR.Api.Entities
{
    public enum FollowTargetType
    {
        Subject = 0,
        SubjectType = 1,
        User = 2
    }

    public class Follow
    {
        public long Id { get; set; }
        public required string FollowerId { get; set; }
        public FollowTargetType TargetType { get; set; }
        public int? SubjectId { get; set; }
        public int? SubjectTypeId { get; set; }
        public string? FollowedUserId { get; set; }
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        [ForeignKey(nameof(FollowerId))]
        public ApplicationUser? Follower { get; set; }
        public Subject? Subject { get; set; }
        public SubjectType? SubjectType { get; set; }
        public ApplicationUser? FollowedUser { get; set; }
    }
}
