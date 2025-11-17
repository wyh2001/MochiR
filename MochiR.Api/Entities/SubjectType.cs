namespace MochiR.Api.Entities
{
    public class SubjectType
    {
        public int Id { get; set; }
        public required string Key { get; set; }
        public required string DisplayName { get; set; }
        public ICollection<SubjectTypeSetting> Settings { get; set; } = new List<SubjectTypeSetting>();
    }

    public class SubjectTypeSetting
    {
        public string Key { get; set; } = string.Empty;
        public string? Value { get; set; }
        public string? Note { get; set; }
    }
}
