using Microsoft.AspNetCore.Identity;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using MochiR.Api.Services.Email;
using System.Net.Mail;

namespace MochiR.Api.Endpoints
{
    public static partial class UsersEndpoints
    {
        static partial void MapSelfEmailEndpoints(RouteGroupBuilder selfGroup)
        {
            selfGroup.MapPost("/email/token", async (
                SelfEmailTokenRequestDto dto,
                UserManager<ApplicationUser> userManager,
                IEmailSender emailSender,
                IIdentityEmailComposer emailComposer,
                HttpContext httpContext) =>
            {
                var user = await GetCurrentUserAsync(userManager, httpContext);
                if (user is null)
                {
                    return SelfNotFound(httpContext);
                }

                var hasPassword = await userManager.HasPasswordAsync(user);
                if (hasPassword)
                {
                    if (string.IsNullOrWhiteSpace(dto.CurrentPassword))
                    {
                        return ApiResults.Failure(
                            "SELF_EMAIL_PASSWORD_REQUIRED",
                            "Current password is required to request email tokens.",
                            httpContext,
                            StatusCodes.Status400BadRequest);
                    }

                    var passwordValid = await userManager.CheckPasswordAsync(user, dto.CurrentPassword);
                    if (!passwordValid)
                    {
                        return ApiResults.Failure(
                            "SELF_EMAIL_PASSWORD_INVALID",
                            "The supplied password is incorrect.",
                            httpContext,
                            StatusCodes.Status400BadRequest);
                    }
                }

                var targetEmail = dto.Email?.Trim();
                if (string.IsNullOrWhiteSpace(targetEmail))
                {
                    if (string.IsNullOrWhiteSpace(user.Email))
                    {
                        return ApiResults.Failure(
                            "SELF_EMAIL_MISSING",
                            "No email is currently associated with this account.",
                            httpContext,
                            StatusCodes.Status400BadRequest);
                    }

                    if (user.EmailConfirmed)
                    {
                        return ApiResults.Failure(
                            "SELF_EMAIL_ALREADY_CONFIRMED",
                            "The email address is already confirmed.",
                            httpContext,
                            StatusCodes.Status400BadRequest);
                    }

                    var confirmationToken = await userManager.GenerateEmailConfirmationTokenAsync(user);
                    await DispatchEmailTokenAsync(emailSender, emailComposer, user.Email!, EmailTokenPurpose.Confirm, confirmationToken, httpContext.RequestAborted);
                    var confirmResponse = new SelfEmailTokenDispatchResponseDto(user.Id, user.Email!, EmailTokenPurpose.Confirm);
                    return ApiResults.Ok(confirmResponse, httpContext);
                }

                if (!IsValidEmail(targetEmail))
                {
                    return ApiResults.Failure(
                        "SELF_EMAIL_INVALID",
                        "The email address format is invalid.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                if (string.Equals(targetEmail, user.Email, StringComparison.OrdinalIgnoreCase))
                {
                    if (user.EmailConfirmed)
                    {
                        return ApiResults.Failure(
                            "SELF_EMAIL_ALREADY_CONFIRMED",
                            "The email address is already confirmed.",
                            httpContext,
                            StatusCodes.Status400BadRequest);
                    }

                    var repeatToken = await userManager.GenerateEmailConfirmationTokenAsync(user);
                    await DispatchEmailTokenAsync(emailSender, emailComposer, user.Email!, EmailTokenPurpose.Confirm, repeatToken, httpContext.RequestAborted);
                    var repeatResponse = new SelfEmailTokenDispatchResponseDto(user.Id, user.Email!, EmailTokenPurpose.Confirm);
                    return ApiResults.Ok(repeatResponse, httpContext);
                }

                var conflict = await userManager.FindByEmailAsync(targetEmail);
                if (conflict is not null && !string.Equals(conflict.Id, user.Id, StringComparison.Ordinal))
                {
                    return ApiResults.Failure(
                        "SELF_EMAIL_CONFLICT",
                        "The email address is already in use.",
                        httpContext,
                        StatusCodes.Status409Conflict);
                }

                var changeToken = await userManager.GenerateChangeEmailTokenAsync(user, targetEmail);
                await DispatchEmailTokenAsync(emailSender, emailComposer, targetEmail, EmailTokenPurpose.Change, changeToken, httpContext.RequestAborted);
                var changeResponse = new SelfEmailTokenDispatchResponseDto(user.Id, targetEmail, EmailTokenPurpose.Change);
                return ApiResults.Ok(changeResponse, httpContext);
            }).WithOpenApi();

            selfGroup.MapPost("/email/confirm", async (
                SelfEmailConfirmRequestDto dto,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext) =>
            {
                var user = await GetCurrentUserAsync(userManager, httpContext);
                if (user is null)
                {
                    return SelfNotFound(httpContext);
                }

                var token = dto.Token?.Trim();
                if (string.IsNullOrWhiteSpace(token))
                {
                    return ApiResults.Failure(
                        "SELF_EMAIL_TOKEN_REQUIRED",
                        "A valid token is required.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                var targetEmail = dto.Email?.Trim();
                IdentityResult operationResult;

                if (!string.IsNullOrWhiteSpace(targetEmail) &&
                    !string.Equals(targetEmail, user.Email, StringComparison.OrdinalIgnoreCase))
                {
                    if (!IsValidEmail(targetEmail))
                    {
                        return ApiResults.Failure(
                            "SELF_EMAIL_INVALID",
                            "The email address format is invalid.",
                            httpContext,
                            StatusCodes.Status400BadRequest);
                    }

                    var conflict = await userManager.FindByEmailAsync(targetEmail);
                    if (conflict is not null && !string.Equals(conflict.Id, user.Id, StringComparison.Ordinal))
                    {
                        return ApiResults.Failure(
                            "SELF_EMAIL_CONFLICT",
                            "The email address is already in use.",
                            httpContext,
                            StatusCodes.Status409Conflict);
                    }

                    operationResult = await userManager.ChangeEmailAsync(user, targetEmail, token);
                }
                else
                {
                    if (string.IsNullOrWhiteSpace(user.Email))
                    {
                        return ApiResults.Failure(
                            "SELF_EMAIL_MISSING",
                            "No email is currently associated with this account.",
                            httpContext,
                            StatusCodes.Status400BadRequest);
                    }

                    operationResult = await userManager.ConfirmEmailAsync(user, token);
                }

                if (!operationResult.Succeeded)
                {
                    return ApiResults.Failure(
                        "SELF_EMAIL_CONFIRM_FAILED",
                        "Email confirmation failed.",
                        httpContext,
                        StatusCodes.Status400BadRequest,
                        BuildIdentityErrorDetails(operationResult));
                }

                var securityStampResult = await userManager.UpdateSecurityStampAsync(user);
                if (!securityStampResult.Succeeded)
                {
                    return ApiResults.Failure(
                        "SELF_EMAIL_CONFIRM_FAILED",
                        "Email confirmation failed.",
                        httpContext,
                        StatusCodes.Status400BadRequest,
                        BuildIdentityErrorDetails(securityStampResult));
                }

                var refreshed = await userManager.FindByIdAsync(user.Id) ?? user;
                return ApiResults.Ok(ToSelfProfile(refreshed), httpContext);
            }).WithOpenApi();
        }

        private static bool IsValidEmail(string value)
        {
            try
            {
                _ = new MailAddress(value);
                return true;
            }
            catch
            {
                return false;
            }
        }

        private static Task DispatchEmailTokenAsync(IEmailSender sender, IIdentityEmailComposer composer, string email, string purpose, string token, CancellationToken cancellationToken)
        {
            var template = composer.ComposeEmailToken(email, purpose, token);
            return sender.SendAsync(email, template.Subject, template.Body, cancellationToken);
        }

        private sealed record SelfEmailTokenRequestDto
        {
            public string? Email { get; init; }
            public string? CurrentPassword { get; init; }
        }

        private sealed record SelfEmailTokenDispatchResponseDto(string UserId, string Email, string Purpose);

        private sealed record SelfEmailConfirmRequestDto
        {
            public string? Email { get; init; }
            public required string Token { get; init; }
        }
    }
}
