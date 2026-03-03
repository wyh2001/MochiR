using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using MochiR.Api.Dtos;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using MochiR.Api.Infrastructure.Validation;

namespace MochiR.Api.Endpoints
{
    public static partial class SetupEndpoints
    {
        public static void MapSetupEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/setup")
                .WithTags("Setup")
                .AllowAnonymous();

            group.MapGet("/status", async (RoleManager<IdentityRole> roleManager, UserManager<ApplicationUser> userManager, HttpContext httpContext) =>
            {
                var hasAdmin = await HasAnyAdminAsync(roleManager, userManager);

                return ApiResults.Ok(new SetupStatusDto(!hasAdmin), httpContext);
            })
            .Produces<ApiResponse<SetupStatusDto>>(StatusCodes.Status200OK)
            .WithSummary("Check whether initial admin setup is required.")
            .WithDescription("GET /api/setup/status. Returns whether the system needs an initial Admin account to be created.")
            .WithOpenApi();

            group.MapPost("/admin", async (
                CreateInitialAdminRequestDto dto,
                IConfiguration config,
                RoleManager<IdentityRole> roleManager,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext,
                CancellationToken ct) =>
            {
                var expectedKey = config["Setup:Key"];
                if (string.IsNullOrWhiteSpace(expectedKey))
                {
                    return ApiResults.Failure(
                        "SETUP_DISABLED",
                        "Initial setup is not enabled. Configure Setup:Key to allow creating the initial admin.",
                        httpContext,
                        StatusCodes.Status503ServiceUnavailable);
                }

                var hasHeader = httpContext.Request.Headers.TryGetValue("X-Setup-Key", out var providedKey);
                if (!hasHeader
                    || !CryptographicOperations.FixedTimeEquals(
                        Encoding.UTF8.GetBytes(providedKey.ToString()),
                        Encoding.UTF8.GetBytes(expectedKey)))
                {
                    return ApiResults.Failure(
                        "SETUP_KEY_INVALID",
                        "Setup key is missing or invalid.",
                        httpContext,
                        StatusCodes.Status403Forbidden);
                }

                var hasAdmin = await HasAnyAdminAsync(roleManager, userManager);

                if (hasAdmin)
                {
                    return ApiResults.Failure(
                        "SETUP_ALREADY_COMPLETED",
                        "Initial admin is already configured.",
                        httpContext,
                        StatusCodes.Status409Conflict);
                }

                var userName = dto.UserName.Trim();
                var email = dto.Email.Trim();

                var existingByName = await userManager.FindByNameAsync(userName);
                if (existingByName is not null)
                {
                    return ApiResults.Failure(
                        "SETUP_USERNAME_EXISTS",
                        "A user with this username already exists.",
                        httpContext,
                        StatusCodes.Status409Conflict);
                }

                var existingByEmail = await userManager.FindByEmailAsync(email);
                if (existingByEmail is not null)
                {
                    return ApiResults.Failure(
                        "SETUP_EMAIL_EXISTS",
                        "A user with this email already exists.",
                        httpContext,
                        StatusCodes.Status409Conflict);
                }

                if (!await roleManager.RoleExistsAsync(AppRoles.Admin))
                {
                    var roleResult = await roleManager.CreateAsync(new IdentityRole(AppRoles.Admin));
                    if (!roleResult.Succeeded)
                    {
                        return ApiResults.Failure(
                            "SETUP_ROLE_CREATE_FAILED",
                            "Failed to create admin role.",
                            httpContext,
                            StatusCodes.Status400BadRequest,
                            roleResult.Errors
                                .GroupBy(error => error.Code)
                                .ToDictionary(group => group.Key, group => group.Select(error => error.Description).ToArray()));
                    }
                }

                var user = new ApplicationUser
                {
                    UserName = userName,
                    Email = email,
                    EmailConfirmed = true,
                    LockoutEnabled = false,
                    CreatedAtUtc = DateTime.UtcNow
                };

                var createResult = await userManager.CreateAsync(user, dto.Password);
                if (!createResult.Succeeded)
                {
                    return ApiResults.Failure(
                        "SETUP_USER_CREATE_FAILED",
                        "Failed to create admin user.",
                        httpContext,
                        StatusCodes.Status400BadRequest,
                        createResult.Errors
                            .GroupBy(error => error.Code)
                            .ToDictionary(group => group.Key, group => group.Select(error => error.Description).ToArray()));
                }

                var addRoleResult = await userManager.AddToRoleAsync(user, AppRoles.Admin);
                if (!addRoleResult.Succeeded)
                {
                    return ApiResults.Failure(
                        "SETUP_ROLE_ASSIGN_FAILED",
                        "Admin user created but role assignment failed.",
                        httpContext,
                        StatusCodes.Status400BadRequest,
                        addRoleResult.Errors
                            .GroupBy(error => error.Code)
                            .ToDictionary(group => group.Key, group => group.Select(error => error.Description).ToArray()));
                }

                var payload = new CreateInitialAdminResponseDto(user.Id, user.UserName ?? string.Empty, user.Email ?? string.Empty);
                return ApiResults.Created("/api/users/" + user.Id, payload, httpContext);
            })
            .Produces<ApiResponse<CreateInitialAdminResponseDto>>(StatusCodes.Status201Created)
            .Produces<ApiErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces<ApiErrorResponse>(StatusCodes.Status403Forbidden)
            .Produces<ApiErrorResponse>(StatusCodes.Status409Conflict)
            .Produces<ApiErrorResponse>(StatusCodes.Status503ServiceUnavailable)
            .WithSummary("Create the initial Admin account.")
            .WithDescription("POST /api/setup/admin. Creates the initial Admin user exactly once. Requires X-Setup-Key header matching Setup:Key configuration.")
            .AddValidation<CreateInitialAdminRequestDto>(
                "SETUP_INVALID_INPUT",
                "User name, email, and password are required.")
            .WithOpenApi();
        }

        private static async Task<bool> HasAnyAdminAsync(RoleManager<IdentityRole> roleManager, UserManager<ApplicationUser> userManager)
        {
            if (!await roleManager.RoleExistsAsync(AppRoles.Admin))
            {
                return false;
            }

            var admins = await userManager.GetUsersInRoleAsync(AppRoles.Admin);
            return admins.Count > 0;
        }

        private sealed record SetupStatusDto(bool NeedsSetup);

        internal sealed record CreateInitialAdminRequestDto
        {
            public required string UserName { get; init; }
            public required string Email { get; init; }
            public required string Password { get; init; }
        }

        private sealed record CreateInitialAdminResponseDto(string UserId, string UserName, string Email);
    }
}
