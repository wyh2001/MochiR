using Microsoft.AspNetCore.Identity;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using MochiR.Api.Infrastructure.Validation;
using static MochiR.Api.Dtos.AuthDtos;
namespace MochiR.Api.Endpoints
{
    public static partial class AuthEndpoints
    {
        public static void MapAuthEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/auth").WithTags("Auth");

            group.MapPost("/register", async (
                RegisterDto registerDto,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext) =>
            {
                var user = new ApplicationUser
                {
                    UserName = registerDto.UserName,
                    Email = registerDto.Email,
                    CreatedAtUtc = DateTime.UtcNow
                };
                var result = await userManager.CreateAsync(user, registerDto.Password);
                if (result.Succeeded)
                {
                    var response = new RegisterResponseDto(user.Id, user.UserName, user.Email);
                    return ApiResults.Ok(response, httpContext);
                }

                var details = result.Errors
                    .GroupBy(error => error.Code)
                    .ToDictionary(group => group.Key, group => group.Select(error => error.Description).ToArray());

                return ApiResults.Failure(
                    "AUTH_REGISTER_FAILED",
                    "User registration failed.",
                    httpContext,
                    StatusCodes.Status400BadRequest,
                    details);
            })
            .WithSummary("Register a local account.")
            .WithDescription("POST /api/auth/register. Accepts a JSON body with userName, email, and password. Returns 200 with the created user identifiers or 400 with grouped Identity errors when validation fails.")
            .AddValidation<RegisterDto>(
                "AUTH_REGISTER_INVALID",
                "User name, email, and password are required.")
            .WithOpenApi();

            group.MapPost("/login", async (
                LoginDto loginDto,
                SignInManager<ApplicationUser> signInManager,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext) =>
            {
                var userNameOrEmail = loginDto.UserNameOrEmail.Trim();
                var password = loginDto.Password;
                ApplicationUser? user = await userManager.FindByNameAsync(userNameOrEmail) ?? await userManager.FindByEmailAsync(userNameOrEmail);
                var userNameForSignIn = user?.UserName ?? userNameOrEmail;

                // No matter the user exists or not, proceed to avoid account enumeration
                var result = await signInManager.PasswordSignInAsync(
                    userNameForSignIn,
                    password,
                    isPersistent: false,
                    lockoutOnFailure: true);

                if (result.Succeeded)
                    return ApiResults.Ok(new LoginResponseDto(true), httpContext);
                if (result.IsLockedOut)
                    return ApiResults.Failure(
                        "AUTH_ACCOUNT_LOCKED",
                        "Account is locked. Please try again later.",
                        httpContext,
                        StatusCodes.Status423Locked);
                if (result.RequiresTwoFactor) // TBD: handle 2FA
                    return ApiResults.Failure(
                        "AUTH_REQUIRES_2FA",
                        "Two-factor authentication is required.",
                        httpContext,
                        StatusCodes.Status403Forbidden);
                if (result.IsNotAllowed)
                    return ApiResults.Failure(
                        "AUTH_NOT_ALLOWED",
                        "Sign-in is not allowed for this account.",
                        httpContext,
                        StatusCodes.Status403Forbidden);

                return ApiResults.Failure(
                    "AUTH_INVALID_CREDENTIALS",
                    "Invalid username or password.",
                    httpContext,
                    StatusCodes.Status400BadRequest);
            })
            .WithSummary("Sign in with user name or email.")
            .WithDescription("POST /api/auth/login. Accepts userNameOrEmail and password. Returns 200 with a simple success flag on valid credentials, or 400/403/423 when Identity rejects the login for validation, policy, or lockout reasons.")
            .AddValidation<LoginDto>(
                "AUTH_LOGIN_INVALID",
                "User name or email and password are required.")
            .WithOpenApi();

            group.MapPost("/logout", async (SignInManager<ApplicationUser> signInManager, HttpContext httpContext) =>
            {
                await signInManager.SignOutAsync();
                return ApiResults.Ok(new LogoutResponseDto(true), httpContext);
            })
            .WithSummary("Sign out the current user.")
            .WithDescription("POST /api/auth/logout. Requires authentication. Clears the application cookie and returns 200 with a signedOut flag.")
            .WithOpenApi()
            .RequireAuthorization();

            MapPasswordResetEndpoints(group);
        }

        static partial void MapPasswordResetEndpoints(RouteGroupBuilder group);
    }

    internal sealed record RegisterResponseDto(string? UserId, string? UserName, string? Email);
    internal sealed record LoginResponseDto(bool SignedIn);
    internal sealed record LogoutResponseDto(bool SignedOut);
}
