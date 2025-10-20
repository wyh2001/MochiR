using Microsoft.AspNetCore.Identity;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using System.Text.Json.Nodes;

namespace MochiR.Api.Endpoints
{
    public static partial class UsersEndpoints
    {
        private static void MapSelfEndpoints(IEndpointRouteBuilder routes)
        {
            var selfGroup = routes.MapGroup("/api/me")
                .WithTags("Self")
                .RequireAuthorization();

            selfGroup.MapGet("/", async (UserManager<ApplicationUser> userManager, HttpContext httpContext) =>
            {
                var user = await GetCurrentUserAsync(userManager, httpContext);
                if (user is null)
                {
                    return SelfNotFound(httpContext);
                }

                return ApiResults.Ok(ToSelfProfile(user), httpContext);
            }).WithOpenApi();

            selfGroup.MapPatch("/", async (JsonObject? payload, UserManager<ApplicationUser> userManager, HttpContext httpContext) =>
            {
                payload ??= new JsonObject();

                var user = await GetCurrentUserAsync(userManager, httpContext);
                if (user is null)
                {
                    return SelfNotFound(httpContext);
                }

                if (!TryApplyString(payload, "displayName", value => user.DisplayName = value) ||
                    !TryApplyString(payload, "avatarUrl", value => user.AvatarUrl = value))
                {
                    return ApiResults.Failure(
                        "SELF_INVALID_PAYLOAD",
                        "One or more fields are invalid.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                var updateResult = await userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    return ApiResults.Failure(
                        "SELF_UPDATE_FAILED",
                        "Failed to update profile.",
                        httpContext,
                        StatusCodes.Status400BadRequest,
                        BuildIdentityErrorDetails(updateResult));
                }

                return ApiResults.Ok(ToSelfProfile(user), httpContext);
            }).WithOpenApi();

            MapSelfPasswordEndpoints(selfGroup);
            MapSelfEmailEndpoints(selfGroup);
        }

        private static SelfProfileDto ToSelfProfile(ApplicationUser user) => new(
            user.Id,
            user.UserName,
            user.DisplayName,
            user.Email,
            user.EmailConfirmed,
            user.PhoneNumber,
            user.PhoneNumberConfirmed,
            user.AvatarUrl,
            user.TwoFactorEnabled,
            user.LockoutEnabled,
            user.LockoutEnd,
            user.CreatedAtUtc);

        private static IResult SelfNotFound(HttpContext httpContext) => ApiResults.Failure(
            "SELF_NOT_FOUND",
            "Unable to resolve the current user.",
            httpContext,
            StatusCodes.Status401Unauthorized);

        static partial void MapSelfPasswordEndpoints(RouteGroupBuilder selfGroup);
        static partial void MapSelfEmailEndpoints(RouteGroupBuilder selfGroup);

        private record SelfProfileDto(
            string Id,
            string? UserName,
            string? DisplayName,
            string? Email,
            bool EmailConfirmed,
            string? PhoneNumber,
            bool PhoneNumberConfirmed,
            string? AvatarUrl,
            bool TwoFactorEnabled,
            bool LockoutEnabled,
            DateTimeOffset? LockoutEnd,
            DateTime CreatedAtUtc);
    }
}
