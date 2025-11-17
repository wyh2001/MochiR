namespace MochiR.Api.Entities
{
    public enum MediaType
    {
        Image = 0,
        Video = 1
    }

    public class ReviewMedia
    {
        public long Id { get; set; }

        public long ReviewId { get; set; }
        public Review? Review { get; set; }

        public required string Url { get; set; }

        public MediaType Type { get; set; }

        public ICollection<ReviewMediaMetadata> Metadata { get; set; } = new List<ReviewMediaMetadata>();
    }

    public class ReviewMediaMetadata
    {
        public string Key { get; set; } = string.Empty;
        public string? Value { get; set; }
        public string? Note { get; set; }
    }
}
