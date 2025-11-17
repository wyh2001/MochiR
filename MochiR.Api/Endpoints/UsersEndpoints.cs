namespace MochiR.Api.Endpoints
{
    public static partial class UsersEndpoints
    {
        private const int DefaultPageSize = 20;
        private const int MaxPageSize = 100;

        public static void MapUsersEndpoints(this IEndpointRouteBuilder routes)
        {
            MapSelfEndpoints(routes);
            MapUserDirectoryAndAdminEndpoints(routes);
        }
    }
}
