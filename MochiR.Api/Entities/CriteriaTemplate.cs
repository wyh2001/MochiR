using System.Text.Json;

namespace MochiR.Api.Entities
{
    public class CriteriaTemplate
    {
        public int Id { get; set; }

        public int SubjectTypeId { get; set; }
        public SubjectType? SubjectType { get; set; }

        public required string Key { get; set; }
        public required string DisplayName { get; set; }

        public bool IsRequired { get; set; }
    }
}
