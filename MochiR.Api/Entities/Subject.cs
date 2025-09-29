using System.Text.Json;

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

        // JSON data for type-specific attributes (e.g., brand, model, campus, cuisine...)
        public JsonDocument? Extra { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsDeleted { get; set; }
    }
}
