using MochiR.Api.Dtos;

namespace MochiR.Api.Services.Search;

public interface ISearchService
{
    Task<SearchResultSet> SearchAsync(SearchOptions options, CancellationToken cancellationToken);
}

public sealed record SearchOptions(
    string Query,
    SearchResource Type = SearchResource.All,
    SearchSort Sort = SearchSort.Relevance,
    int Limit = 20,
    string? Cursor = null);

public sealed record SearchResultSet(
    IReadOnlyList<SearchResultDto> Results,
    string? NextCursor)
{
    public static SearchResultSet Empty { get; } = new SearchResultSet(Array.Empty<SearchResultDto>(), null);
}
