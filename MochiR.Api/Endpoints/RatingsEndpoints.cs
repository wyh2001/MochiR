namespace MochiR.Api.Endpoints
{
    public static class RatingsEndpoints
    {
        public static void MapRatingsEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/ratings").WithTags("Ratings");
            group.MapGet("/", () => "Ratings endpoint is working...");
        }
    }
}
