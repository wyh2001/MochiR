using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using MochiR.Api.Dtos;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Tests;

public static class TestAuthHelper
{
    private const string DefaultPassword = "P@ssw0rd!";

    public static Task<ApplicationUser> SignInAsAdminAsync(this HttpClient client, WebApplicationFactory<Program> factory)
        => client.SignInAsync(factory, isAdmin: true);

    public static Task<ApplicationUser> SignInAsUserAsync(this HttpClient client, WebApplicationFactory<Program> factory)
        => client.SignInAsync(factory, isAdmin: false);

    public static Task<ApplicationUser> SignInAsUserAsync(this HttpClient client, WebApplicationFactory<Program> factory, string password)
        => client.SignInAsync(factory, isAdmin: false, password: password);

    public static HttpClient CreateClientWithCookies(this WebApplicationFactory<Program> factory)
        => factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });

    public static async Task<HttpClient> CreateAuthenticatedClientAsync(this WebApplicationFactory<Program> factory)
    {
        var client = factory.CreateClientWithCookies();
        _ = await client.SignInAsUserAsync(factory);
        return client;
    }

    private static async Task<ApplicationUser> SignInAsync(this HttpClient client, WebApplicationFactory<Program> factory, bool isAdmin, string? password = null)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        var userName = $"user-{Guid.NewGuid():N}";
        var email = $"{userName}@example.com";

        var user = new ApplicationUser
        {
            UserName = userName,
            Email = email,
            EmailConfirmed = true,
            LockoutEnabled = false,
            DisplayName = "Test User",
            AvatarUrl = "https://example.com/avatar.png"
        };

        var createResult = await userManager.CreateAsync(user, password ?? DefaultPassword);
        Assert.True(createResult.Succeeded, string.Join(",", createResult.Errors.Select(e => e.Description)));

        if (isAdmin)
        {
            if (!await roleManager.RoleExistsAsync(AppRoles.Admin))
            {
                var roleResult = await roleManager.CreateAsync(new IdentityRole(AppRoles.Admin));
                Assert.True(roleResult.Succeeded, string.Join(",", roleResult.Errors.Select(e => e.Description)));
            }

            var addRoleResult = await userManager.AddToRoleAsync(user, AppRoles.Admin);
            Assert.True(addRoleResult.Succeeded, string.Join(",", addRoleResult.Errors.Select(e => e.Description)));
        }

        var loginPayload = new AuthDtos.LoginDto(userName, password ?? DefaultPassword);
        var response = await client.PostAsJsonAsync("/api/auth/login", loginPayload);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        return user;
    }
}
