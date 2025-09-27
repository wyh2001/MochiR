namespace MochiR.Api.Endpoints
{
    public static class UsersEndpoints
    {
        public static void MapUsersEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/users").WithTags("Users");
            group.MapGet("/", () => "Users endpoint is working...");
        }
    }
}
