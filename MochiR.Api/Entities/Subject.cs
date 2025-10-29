namespace MochiR.Api.Entities
{
    public class Subject
    {
        public int Id { get; set; }

        // Foreign Key to SubjectType
        public int SubjectTypeId { get; set; }
        public SubjectType? SubjectType { get; set; }

        public required string Name { get; set; }
        public required string Slug { get; set; }

        // Type-specific attributes stored as key/value pairs
        public ICollection<SubjectAttribute> Attributes { get; set; } = new List<SubjectAttribute>();

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsDeleted { get; set; }
    }

    public class SubjectAttribute
    {
        public string Key { get; set; } = string.Empty;
        public string? Value { get; set; }
        public string? Note { get; set; }
    }
}
