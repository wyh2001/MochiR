using Microsoft.AspNetCore.Identity;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

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

            selfGroup.MapPatch("/", async (SelfProfilePatchRequestDto dto, UserManager<ApplicationUser> userManager, HttpContext httpContext) =>
            {
                var user = await GetCurrentUserAsync(userManager, httpContext);
                if (user is null)
                {
                    return SelfNotFound(httpContext);
                }

                if (!dto.IsValid)
                {
                    return ApiResults.Failure(
                        "SELF_INVALID_PAYLOAD",
                        "One or more fields are invalid.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                if (dto.DisplayNameSpecified)
                {
                    user.DisplayName = dto.DisplayName;
                }

                if (dto.AvatarUrlSpecified)
                {
                    user.AvatarUrl = dto.AvatarUrl;
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

        private sealed record SelfProfilePatchRequestDto
        {
            public string? DisplayName { get; init; }
            public string? AvatarUrl { get; init; }

            [JsonIgnore]
            public bool DisplayNameSpecified { get; init; }

            [JsonIgnore]
            public bool AvatarUrlSpecified { get; init; }

            [JsonIgnore]
            public bool IsValid { get; init; }

            public static async ValueTask<SelfProfilePatchRequestDto?> BindAsync(HttpContext context)
            {
                var payload = await context.Request.ReadFromJsonAsync<JsonObject>(cancellationToken: context.RequestAborted) ?? new JsonObject();

                var isValid = true;

                string? displayName = null;
                var displaySpecified = false;
                if (TryGetNode(payload, "displayName", out var displayNode))
                {
                    displaySpecified = true;
                    if (!TryReadTrimmedString(displayNode, out displayName))
                    {
                        isValid = false;
                    }
                }

                string? avatarUrl = null;
                var avatarSpecified = false;
                if (TryGetNode(payload, "avatarUrl", out var avatarNode))
                {
                    avatarSpecified = true;
                    if (!TryReadTrimmedString(avatarNode, out avatarUrl))
                    {
                        isValid = false;
                    }
                }

                return new SelfProfilePatchRequestDto
                {
                    DisplayName = displayName,
                    AvatarUrl = avatarUrl,
                    DisplayNameSpecified = displaySpecified,
                    AvatarUrlSpecified = avatarSpecified,
                    IsValid = isValid
                };
            }
        }
    }
}
