using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using MochiR.Api.Dtos;

namespace MochiR.Tests.Endpoints;

public sealed class AuthEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory factory;
    private readonly HttpClient client;

    public AuthEndpointsTests(CustomWebApplicationFactory factory)
    {
        this.factory = factory;
        client = factory.CreateClient();
    }

    [Fact]
    public async Task Register_CreatesUserAndReturnsOk()
    {
        var userName = $"alice_{Guid.NewGuid():N}";
        var email = $"{userName}@example.com";
        var payload = new AuthDtos.RegisterDto(userName, email, "P@ssw0rd!");

        var response = await client.PostAsJsonAsync("/api/auth/register", payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(userName, data.GetProperty("userName").GetString());
        Assert.Equal(email, data.GetProperty("email").GetString());
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsOk()
    {
        var userName = $"bob_{Guid.NewGuid():N}";
        var email = $"{userName}@example.com";
        var password = "P@ssw0rd!";

        var registerPayload = new AuthDtos.RegisterDto(userName, email, password);
        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", registerPayload);
        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        using var scope = factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<MochiR.Api.Entities.ApplicationUser>>();
        var createdUser = await userManager.FindByNameAsync(userName);
        Assert.NotNull(createdUser);
        createdUser.EmailConfirmed = true;
        createdUser.LockoutEnabled = false;
        createdUser.LockoutEnd = null;
        await userManager.UpdateAsync(createdUser);

        var loginPayload = new AuthDtos.LoginDto(userName, password);
        var response = await client.PostAsJsonAsync("/api/auth/login", loginPayload);
        await response.Content.LoadIntoBufferAsync();
        if (response.StatusCode != HttpStatusCode.OK)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new Xunit.Sdk.XunitException($"Login failed with status {response.StatusCode}: {errorBody}");
        }

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
    }

    [Fact]
    public async Task Login_WithInvalidCredentials_ReturnsFailure()
    {
        var payload = new AuthDtos.LoginDto("unknown", "wrong");

        var response = await client.PostAsJsonAsync("/api/auth/login", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("AUTH_INVALID_CREDENTIALS", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task Logout_WithoutAuthentication_ReturnsUnauthorized()
    {
        var response = await client.PostAsync("/api/auth/logout", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
