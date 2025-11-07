using Microsoft.AspNetCore.Identity;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using MochiR.Api.Infrastructure.Validation;
using MochiR.Api.Services.Email;

namespace MochiR.Api.Endpoints
{
    public static partial class AuthEndpoints
    {
        static partial void MapPasswordResetEndpoints(RouteGroupBuilder group)
        {
            group.MapPost("/password/reset/request", async (
                PasswordResetTokenRequestDto dto,
                UserManager<ApplicationUser> userManager,
                IEmailSender emailSender,
                IIdentityEmailComposer emailComposer,
                HttpContext httpContext) =>
            {
                var email = dto.Email.Trim();

                var user = await userManager.FindByEmailAsync(email);
                if (user is not null && !user.IsDeleted && user.EmailConfirmed)
                {
                    var token = await userManager.GeneratePasswordResetTokenAsync(user);
                    await DispatchPasswordResetTokenAsync(emailSender, emailComposer, email, token, httpContext.RequestAborted);
                }

                var response = new PasswordResetTokenDispatchResponseDto(true);
                return ApiResults.Ok(response, httpContext);
            })
            .WithSummary("Request a password reset email.")
            .WithDescription("POST /api/auth/password/reset/request. Accepts an email address and always returns 200 with dispatched=true. When the address matches a confirmed account a reset token is generated and emailed; unknown addresses receive the same response to avoid disclosure.")
            .AddValidation<PasswordResetTokenRequestDto>(
                "AUTH_PASSWORD_RESET_EMAIL_INVALID",
                "A valid email address is required.")
            .WithOpenApi();

            group.MapPost("/password/reset/confirm", async (
                PasswordResetConfirmRequestDto dto,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext) =>
            {
                var email = dto.Email.Trim();
                var token = dto.Token.Trim();
                var newPassword = dto.NewPassword;

                var user = await userManager.FindByEmailAsync(email);
                if (user is null || user.IsDeleted)
                {
                    return ApiResults.Failure(
                        "AUTH_PASSWORD_RESET_FAILED",
                        "Password reset failed.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                var resetResult = await userManager.ResetPasswordAsync(user, token, newPassword);
                if (!resetResult.Succeeded)
                {
                    return ApiResults.Failure(
                        "AUTH_PASSWORD_RESET_FAILED",
                        "Password reset failed.",
                        httpContext,
                        StatusCodes.Status400BadRequest,
                        BuildIdentityErrorDetails(resetResult));
                }

                var securityStampResult = await userManager.UpdateSecurityStampAsync(user);
                if (!securityStampResult.Succeeded)
                {
                    return ApiResults.Failure(
                        "AUTH_PASSWORD_RESET_FAILED",
                        "Password reset failed.",
                        httpContext,
                        StatusCodes.Status400BadRequest,
                        BuildIdentityErrorDetails(securityStampResult));
                }

                return ApiResults.Ok(new PasswordResetConfirmResponseDto(true), httpContext);
            })
            .WithSummary("Reset the password with a token.")
            .WithDescription("POST /api/auth/password/reset/confirm. Accepts email, token, and newPassword. Returns 200 with succeeded=true when the token is valid, or 400 with error codes when the reset fails.")
            .AddValidation<PasswordResetConfirmRequestDto>(
                "AUTH_PASSWORD_RESET_INVALID_PAYLOAD",
                "Email, token, and new password are required.")
            .WithOpenApi();
        }

        private static Task DispatchPasswordResetTokenAsync(
            IEmailSender sender,
            IIdentityEmailComposer composer,
            string email,
            string token,
            CancellationToken cancellationToken)
        {
            var template = composer.ComposeEmailToken(email, EmailTokenPurpose.ResetPassword, token);
            return sender.SendAsync(email, template.Subject, template.Body, cancellationToken);
        }

        private static IReadOnlyDictionary<string, string[]> BuildIdentityErrorDetails(IdentityResult result)
            => result.Errors
                .GroupBy(error => error.Code)
                .ToDictionary(group => group.Key, group => group.Select(error => error.Description).ToArray());

        internal sealed record PasswordResetTokenRequestDto
        {
            public required string Email { get; init; }
        }

        private sealed record PasswordResetTokenDispatchResponseDto(bool Dispatched);

        internal sealed record PasswordResetConfirmRequestDto
        {
            public required string Email { get; init; }
            public required string Token { get; init; }
            public required string NewPassword { get; init; }
        }

        private sealed record PasswordResetConfirmResponseDto(bool Succeeded);
    }
}
