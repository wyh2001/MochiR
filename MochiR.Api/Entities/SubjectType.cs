using System.Text.Json;

namespace MochiR.Api.Entities
{
    public class SubjectType
    {
        public int Id { get; set; }
        public required string Key { get; set; }
        public required string DisplayName { get; set; }
        public JsonDocument? MetaData { get; set; }
    }
}
