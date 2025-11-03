using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using MochiR.Api.Entities;

namespace MochiR.Tests.Endpoints;

public sealed class UsersSelfEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private const string DefaultPassword = "P@ssw0rd!";
    private readonly CustomWebApplicationFactory factory;

    public UsersSelfEndpointsTests(CustomWebApplicationFactory factory)
    {
        this.factory = factory;
    }

    [Fact]
    public async Task GetSelfProfile_ReturnsProfile()
    {
        using var client = factory.CreateClientWithCookies();
        var user = await client.SignInAsUserAsync(factory);

        var response = await client.GetAsync("/api/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(user.Id, data.GetProperty("id").GetString());
        Assert.Equal(user.UserName, data.GetProperty("userName").GetString());
    }

    [Fact]
    public async Task PatchSelfProfile_UpdatesProfile()
    {
        using var client = factory.CreateClientWithCookies();
        var user = await client.SignInAsUserAsync(factory);

        var payload = new
        {
            displayName = "Updated Display",
            avatarUrl = "https://example.com/avatar.png"
        };

        var request = new HttpRequestMessage(HttpMethod.Patch, "/api/me")
        {
            Content = JsonContent.Create(payload)
        };

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal("Updated Display", data.GetProperty("displayName").GetString());
        Assert.Equal("https://example.com/avatar.png", data.GetProperty("avatarUrl").GetString());

        await using var scope = factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var updated = await userManager.FindByIdAsync(user.Id);
        Assert.Equal("Updated Display", updated!.DisplayName);
        Assert.Equal("https://example.com/avatar.png", updated.AvatarUrl);
    }

    [Fact]
    public async Task PatchSelfProfile_InvalidPayload_ReturnsBadRequest()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var payload = new { displayName = new[] { "invalid" } };
        var request = new HttpRequestMessage(HttpMethod.Patch, "/api/me")
        {
            Content = JsonContent.Create(payload)
        };

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("SELF_INVALID_PAYLOAD", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task ChangePassword_WithValidCredentials_Succeeds()
    {
        using var client = factory.CreateClientWithCookies();
        var user = await client.SignInAsUserAsync(factory);

        var payload = new { CurrentPassword = DefaultPassword, NewPassword = "NewValid123!" };
        var response = await client.PostAsJsonAsync("/api/me/password/change", payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());

        await using var scope = factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var refreshed = await userManager.FindByIdAsync(user.Id);
        Assert.True(await userManager.CheckPasswordAsync(refreshed!, "NewValid123!"));
    }

    [Fact]
    public async Task ChangePassword_MissingFields_ReturnsBadRequest()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var payload = new { CurrentPassword = " ", NewPassword = " " };
        var response = await client.PostAsJsonAsync("/api/me/password/change", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("SELF_PASSWORD_INVALID_PAYLOAD", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task RequestEmailToken_ForExistingUnconfirmedEmail_ReturnsOk()
    {
        using var client = factory.CreateClientWithCookies();
        var user = await client.SignInAsUserAsync(factory);

        await SetEmailConfirmedAsync(user.Id, confirmed: false);

        var payload = new { CurrentPassword = DefaultPassword };
        var response = await client.PostAsJsonAsync("/api/me/email/token", payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var purpose = json.GetProperty("data").GetProperty("purpose").GetString();
        Assert.Equal("confirm", purpose, StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RequestEmailToken_WithConflictingEmail_ReturnsConflict()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var conflictingEmail = "conflict@example.com";
        await CreateUserWithEmailAsync(conflictingEmail);

        var payload = new { Email = conflictingEmail, CurrentPassword = DefaultPassword };
        var response = await client.PostAsJsonAsync("/api/me/email/token", payload);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("SELF_EMAIL_CONFLICT", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task ConfirmEmail_WithExistingEmailToken_Succeeds()
    {
        using var client = factory.CreateClientWithCookies();
        var user = await client.SignInAsUserAsync(factory);

        await SetEmailConfirmedAsync(user.Id, confirmed: false);

        await using var scope = factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var refreshed = await userManager.FindByIdAsync(user.Id);
        var token = await userManager.GenerateEmailConfirmationTokenAsync(refreshed!);

        var payload = new { Token = token };
        var response = await client.PostAsJsonAsync("/api/me/email/confirm", payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("data").GetProperty("emailConfirmed").GetBoolean());
    }

    [Fact]
    public async Task ConfirmEmail_WithChangeToken_UpdatesEmail()
    {
        using var client = factory.CreateClientWithCookies();
        var user = await client.SignInAsUserAsync(factory);

        var newEmail = "change@example.com";

        await using var scope = factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var refreshed = await userManager.FindByIdAsync(user.Id);
        var token = await userManager.GenerateChangeEmailTokenAsync(refreshed!, newEmail);

        var payload = new { Email = newEmail, Token = token };
        var response = await client.PostAsJsonAsync("/api/me/email/confirm", payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(newEmail, json.GetProperty("data").GetProperty("email").GetString());
    }

    [Fact]
    public async Task ConfirmEmail_MissingToken_ReturnsBadRequest()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var payload = new { Token = " " };
        var response = await client.PostAsJsonAsync("/api/me/email/confirm", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("SELF_EMAIL_TOKEN_REQUIRED", json.GetProperty("error").GetProperty("code").GetString());
    }

    private async Task SetEmailConfirmedAsync(string userId, bool confirmed)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await userManager.FindByIdAsync(userId);
        user!.EmailConfirmed = confirmed;
        var update = await userManager.UpdateAsync(user);
        Assert.True(update.Succeeded, string.Join(",", update.Errors.Select(e => e.Description)));
    }

    private async Task CreateUserWithEmailAsync(string email)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = new ApplicationUser
        {
            UserName = $"conflict-{Guid.NewGuid():N}",
            Email = email,
            EmailConfirmed = true
        };

        var result = await userManager.CreateAsync(user, DefaultPassword);
        Assert.True(result.Succeeded, string.Join(",", result.Errors.Select(e => e.Description)));
    }
}
