using MochiR.Api.Dtos;
using MochiR.Api.Infrastructure;
using MochiR.Api.Services.Search;

namespace MochiR.Api.Endpoints
{
    public static partial class SearchEndpoints
    {
        public static void MapSearchEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/search").WithTags("Search");

            group.MapGet("/", async (
                string query,
                SearchResource? type,
                SearchSort? sort,
                int? limit,
                string? cursor,
                ISearchService searchService,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
            {
                if (string.IsNullOrWhiteSpace(query))
                {
                    return ApiResults.Failure(
                        "SEARCH_QUERY_REQUIRED",
                        "Query is required.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                var options = new SearchOptions(
                    query.Trim(),
                    type ?? SearchResource.All,
                    sort ?? SearchSort.Relevance,
                    limit ?? 20,
                    cursor);

                try
                {
                    var result = await searchService.SearchAsync(options, cancellationToken);
                    var payload = new SearchResponseDto(
                        result.Results,
                        options.Sort.ToString().ToLowerInvariant(),
                        options.Type.ToString().ToLowerInvariant(),
                        result.NextCursor);

                    return ApiResults.Ok(payload, httpContext);
                }
                catch (ArgumentException exception)
                {
                    return ApiResults.Failure(
                        "SEARCH_INVALID_CURSOR",
                        exception.Message,
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }
            })
            .Produces<ApiResponse<SearchResponseDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .WithSummary("Execute a search query.")
            .WithDescription("GET /api/search. Supports optional type, sort, limit, and cursor parameters.")
            .WithOpenApi();
        }
    }
}
