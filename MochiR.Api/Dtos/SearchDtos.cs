using System.Text.Json.Serialization;

namespace MochiR.Api.Dtos;

public enum SearchResource
{
    All,
    Subjects,
    Reviews
}

public enum SearchSort
{
    Relevance,
    Latest
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum SearchResultType
{
    Subject,
    Review
}

public sealed record SearchResultDto(
    SearchResultType Type,
    int? SubjectId,
    long? ReviewId,
    string Title,
    string? Subtitle,
    string? Excerpt,
    double Score,
    DateTime CreatedAtUtc);

public sealed record SearchResponseDto(
    IReadOnlyList<SearchResultDto> Results,
    string Sort,
    string Type,
    string? NextCursor);
