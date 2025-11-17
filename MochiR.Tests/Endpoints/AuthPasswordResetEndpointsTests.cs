using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using MochiR.Api.Dtos;
using MochiR.Api.Entities;

namespace MochiR.Tests.Endpoints;

public sealed class AuthPasswordResetEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory factory;
    private readonly HttpClient client;

    public AuthPasswordResetEndpointsTests(CustomWebApplicationFactory factory)
    {
        this.factory = factory;
        client = factory.CreateClient();
    }

    [Fact]
    public async Task Request_WithInvalidEmail_ReturnsFailure()
    {
        var payload = new { email = "not-an-email" };

        var response = await client.PostAsJsonAsync("/api/auth/password/reset/request", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("AUTH_PASSWORD_RESET_EMAIL_INVALID", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task Request_WithConfirmedUserEmail_ReturnsOk()
    {
        var password = "P@ssw0rd!";
        var (_, email) = await RegisterAndConfirmUserAsync(password);

        var payload = new { Email = email };
        var response = await client.PostAsJsonAsync("/api/auth/password/reset/request", payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        Assert.True(json.GetProperty("data").GetProperty("dispatched").GetBoolean());
    }

    [Fact]
    public async Task Confirm_WithInvalidToken_ReturnsFailure()
    {
        var password = "P@ssw0rd!";
        var (_, email) = await RegisterAndConfirmUserAsync(password);

        var payload = new { Email = email, Token = "invalid-token", NewPassword = "NewPass123!" };
        var response = await client.PostAsJsonAsync("/api/auth/password/reset/confirm", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("AUTH_PASSWORD_RESET_FAILED", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task Confirm_WithValidToken_UpdatesPassword()
    {
        const string originalPassword = "P@ssw0rd!";
        var (_, email) = await RegisterAndConfirmUserAsync(originalPassword);

        string token;
        using (var scope = factory.Services.CreateScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = await userManager.FindByEmailAsync(email);
            Assert.NotNull(user);
            token = await userManager.GeneratePasswordResetTokenAsync(user);
        }

        var newPassword = "NewPass123!";
        var payload = new { Email = email, Token = token, NewPassword = newPassword };
        var response = await client.PostAsJsonAsync("/api/auth/password/reset/confirm", payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        Assert.True(json.GetProperty("data").GetProperty("succeeded").GetBoolean());

        using var verificationScope = factory.Services.CreateScope();
        var userManagerVerification = verificationScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var refreshed = await userManagerVerification.FindByEmailAsync(email);
        Assert.NotNull(refreshed);
        Assert.True(await userManagerVerification.CheckPasswordAsync(refreshed!, newPassword));
        Assert.False(await userManagerVerification.CheckPasswordAsync(refreshed!, originalPassword));
    }

    private async Task<(string UserName, string Email)> RegisterAndConfirmUserAsync(string password)
    {
        var userName = $"user_{Guid.NewGuid():N}";
        var email = $"{userName}@example.com";
        var registerPayload = new AuthDtos.RegisterDto(userName, email, password);
        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", registerPayload);
        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        using var scope = factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await userManager.FindByNameAsync(userName);
        Assert.NotNull(user);
        user.EmailConfirmed = true;
        user.LockoutEnabled = false;
        user.LockoutEnd = null;
        var updateResult = await userManager.UpdateAsync(user);
        Assert.True(updateResult.Succeeded);

        return (userName, email);
    }
}
