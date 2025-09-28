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

            group.MapPost("/register", (RegisterDto registerDto, UserManager<ApplicationUser> userManager) =>
            {
                return Results.Ok("Register endpoint is working...");
            });

            group.MapPost("/login", (LoginDto loginDto, SignInManager<ApplicationUser> signInManager) =>
            {
                return Results.Ok("Login endpoint is working...");
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
