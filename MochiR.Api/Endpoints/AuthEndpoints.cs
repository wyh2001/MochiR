using Microsoft.AspNetCore.Identity;
using MochiR.Api.Entities;
using static MochiR.Api.Dtos.AuthDtos;
namespace MochiR.Api.Endpoints
{
    public static class AuthEndpoints
    {
        public static void MapAuthEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/auth").WithTags("Auth");

            group.MapPost("/register", async (
                RegisterDto registerDto, 
                UserManager<ApplicationUser> userManager) =>
            {
                var user = new ApplicationUser
                {
                    UserName = registerDto.UserName,
                    Email = registerDto.Email,
                    CreatedAtUtc = DateTime.UtcNow
                };
                var result = await userManager.CreateAsync(user, registerDto.Password);
                return result.Succeeded ? Results.Ok() : Results.BadRequest(result.Errors);
            });

            group.MapPost("/login", async (
                LoginDto loginDto, 
                SignInManager<ApplicationUser> signInManager, 
                UserManager<ApplicationUser> userManager) =>
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
                    return Results.Ok();
                if (result.IsLockedOut)
                    return Results.StatusCode(423);
                if (result.RequiresTwoFactor)
                    return Results.StatusCode(403); // TBD: handle 2FA
                if (result.IsNotAllowed)
                    return Results.Forbid();

                return Results.BadRequest();
            });

            group.MapPost("/logout", async (SignInManager<ApplicationUser> signInManager) =>
            {
                await signInManager.SignOutAsync();
                return Results.Ok();
            }).WithOpenApi()
            .RequireAuthorization();
        }
    }
}
