using Microsoft.AspNetCore.Identity;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using MochiR.Api.Infrastructure.Validation;

namespace MochiR.Api.Endpoints
{
    public static partial class UsersEndpoints
    {
        static partial void MapSelfPasswordEndpoints(RouteGroupBuilder selfGroup)
        {
            selfGroup.MapPost("/password/change", async (
                SelfPasswordChangeRequestDto dto,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext) =>
            {
                var user = await GetCurrentUserAsync(userManager, httpContext);
                if (user is null)
                {
                    return SelfNotFound(httpContext);
                }

                var changeResult = await userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
                if (!changeResult.Succeeded)
                {
                    return ApiResults.Failure(
                        "SELF_PASSWORD_CHANGE_FAILED",
                        "Failed to change password.",
                        httpContext,
                        StatusCodes.Status400BadRequest,
                        BuildIdentityErrorDetails(changeResult));
                }

                var securityStampResult = await userManager.UpdateSecurityStampAsync(user);
                if (!securityStampResult.Succeeded)
                {
                    return ApiResults.Failure(
                        "SELF_PASSWORD_CHANGE_FAILED",
                        "Failed to change password.",
                        httpContext,
                        StatusCodes.Status400BadRequest,
                        BuildIdentityErrorDetails(securityStampResult));
                }

                var refreshed = await userManager.FindByIdAsync(user.Id) ?? user;
                return ApiResults.Ok(ToSelfProfile(refreshed), httpContext);
            })
            .AddValidation<SelfPasswordChangeRequestDto>(
                "SELF_PASSWORD_INVALID_PAYLOAD",
                "Current and new passwords are required.")
            .WithOpenApi();
        }

        internal sealed record SelfPasswordChangeRequestDto
        {
            public required string CurrentPassword { get; init; }
            public required string NewPassword { get; init; }
        }
    }
}
