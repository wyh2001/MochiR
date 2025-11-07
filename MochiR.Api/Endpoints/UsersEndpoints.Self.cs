using DotNext;
using DotNext.Text.Json;
using Microsoft.AspNetCore.Identity;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
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
            })
            .WithSummary("Get the current user's profile.")
            .WithDescription("GET /api/me. Requires authentication. Returns 200 with the caller's profile attributes including counts and security flags.")
            .WithOpenApi();

            selfGroup.MapPatch("/", async (SelfProfilePatchRequestDto dto, UserManager<ApplicationUser> userManager, HttpContext httpContext) =>
            {
                var user = await GetCurrentUserAsync(userManager, httpContext);
                if (user is null)
                {
                    return SelfNotFound(httpContext);
                }

                ApplyOptionalTrimmedString(dto.DisplayName, value => user.DisplayName = value);
                ApplyOptionalTrimmedString(dto.AvatarUrl, value => user.AvatarUrl = value);

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
            })
            .WithSummary("Update the current user's profile.")
            .WithDescription("PATCH /api/me. Requires authentication. Accepts optional displayName and avatarUrl fields. Returns 200 with the updated profile or 400 when validation fails.")
            .Accepts<SelfProfilePatchRequestDto>("application/json")
            .WithMetadata(new InvalidPayloadMetadata(
                "SELF_INVALID_PAYLOAD",
                "One or more fields are invalid."))
            .WithOpenApi();

            MapSelfFollowEndpoints(selfGroup);
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
            user.CreatedAtUtc,
            user.FollowersCount,
            user.FollowingCount);

        private static IResult SelfNotFound(HttpContext httpContext) => ApiResults.Failure(
            "SELF_NOT_FOUND",
            "Unable to resolve the current user.",
            httpContext,
            StatusCodes.Status401Unauthorized);

        static partial void MapSelfFollowEndpoints(RouteGroupBuilder selfGroup);
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
            DateTime CreatedAtUtc,
            int FollowersCount,
            int FollowingCount);

        private sealed record SelfProfilePatchRequestDto
        {
            [JsonConverter(typeof(OptionalConverterFactory))]
            [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
            public Optional<string?> DisplayName { get; init; }

            [JsonConverter(typeof(OptionalConverterFactory))]
            [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
            public Optional<string?> AvatarUrl { get; init; }
        }
    }
}
