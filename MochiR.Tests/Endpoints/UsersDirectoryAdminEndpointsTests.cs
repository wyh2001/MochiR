using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using MochiR.Api.Entities;

namespace MochiR.Tests.Endpoints;

public sealed class UsersDirectoryAdminEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private const string DefaultPassword = "Valid123!";
    private readonly CustomWebApplicationFactory factory;

    public UsersDirectoryAdminEndpointsTests(CustomWebApplicationFactory factory)
    {
        this.factory = factory;
    }

    [Fact]
    public async Task GetUsers_ReturnsPagedResults()
    {
        var userA = await CreateUserAsync("directory-a");
        var userB = await CreateUserAsync("directory-b");
        var deleted = await CreateUserAsync("directory-deleted", isDeleted: true);

        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);

        var response = await client.GetAsync("/api/users?query=directory-");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.True(data.GetProperty("totalCount").GetInt32() >= 2);
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Contains(items, item => item.GetProperty("id").GetString() == userA.Id);
        Assert.Contains(items, item => item.GetProperty("id").GetString() == userB.Id);
        Assert.DoesNotContain(items, item => item.GetProperty("id").GetString() == deleted.Id);
    }

    [Fact]
    public async Task GetUserDetail_AsAdmin_ReturnsSensitiveInfo()
    {
        var target = await CreateUserAsync("detail-admin", emailConfirmed: true, phoneConfirmed: true);

        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);

        var response = await client.GetAsync($"/api/users/{target.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data");
        var sensitive = data.GetProperty("sensitive");
        Assert.Equal(target.Email, sensitive.GetProperty("email").GetString());
        Assert.True(sensitive.GetProperty("emailConfirmed").GetBoolean());
    }

    [Fact]
    public async Task GetUserDetail_NonAdmin_HidesSensitiveInfo()
    {
        var target = await CreateUserAsync("detail-user", emailConfirmed: true);

        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var response = await client.GetAsync($"/api/users/{target.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Null, json.GetProperty("data").GetProperty("sensitive").ValueKind);
    }

    [Fact]
    public async Task PostUser_Unauthorized_ReturnsUnauthorized()
    {
        using var client = factory.CreateClientWithCookies();
        var payload = new { UserName = "unauthorized", Email = "unauthorized@example.com", Password = DefaultPassword };

        var response = await client.PostAsJsonAsync("/api/users", payload);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostUser_Admin_CreatesUserWithRoles()
    {
        using var scope = factory.Services.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        if (!await roleManager.RoleExistsAsync("Manager"))
        {
            var roleResult = await roleManager.CreateAsync(new IdentityRole("Manager"));
            Assert.True(roleResult.Succeeded, string.Join(",", roleResult.Errors.Select(e => e.Description)));
        }

        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);

        var payload = new
        {
            UserName = "create-user",
            Email = "create-user@example.com",
            Password = DefaultPassword,
            DisplayName = "Created User",
            EmailConfirmed = true,
            Roles = new[] { "Manager" }
        };

        var response = await client.PostAsJsonAsync("/api/users", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data");
        Assert.Equal("create-user", data.GetProperty("public").GetProperty("userName").GetString());
        Assert.True(data.GetProperty("sensitive").GetProperty("emailConfirmed").GetBoolean());

        using var verificationScope = factory.Services.CreateScope();
        var userManager = verificationScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var created = await userManager.FindByNameAsync("create-user");
        Assert.NotNull(created);
        var roles = await userManager.GetRolesAsync(created!);
        Assert.Contains("Manager", roles);
    }

    [Fact]
    public async Task PatchUser_Admin_UpdatesFieldsAndRoles()
    {
        var target = await CreateUserAsync("patch-target", emailConfirmed: false, phoneConfirmed: false, roles: new[] { "Editor" });

        using var scope = factory.Services.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var roleName in new[] { "Reviewer", "Staff" })
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                var createRole = await roleManager.CreateAsync(new IdentityRole(roleName));
                Assert.True(createRole.Succeeded, string.Join(",", createRole.Errors.Select(e => e.Description)));
            }
        }

        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);

        var payload = new
        {
            displayName = "Updated Display",
            avatarUrl = "https://example.com/avatar.png",
            phoneNumber = "+10000000000",
            email = "updated@example.com",
            emailConfirmed = true,
            phoneNumberConfirmed = true,
            twoFactorEnabled = true,
            roles = new[] { "Reviewer", "Staff" }
        };

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{target.Id}")
        {
            Content = JsonContent.Create(payload)
        };

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data");
        Assert.Equal("Updated Display", data.GetProperty("public").GetProperty("displayName").GetString());
        var sensitive = data.GetProperty("sensitive");
        Assert.True(sensitive.GetProperty("emailConfirmed").GetBoolean());
        var roles = sensitive.GetProperty("roles").EnumerateArray().Select(r => r.GetString()).ToList();
        Assert.Contains("Reviewer", roles);
        Assert.Contains("Staff", roles);

        using var verificationScope = factory.Services.CreateScope();
        var userManager = verificationScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var updated = await userManager.FindByIdAsync(target.Id);
        Assert.NotNull(updated);
        Assert.Equal("Updated Display", updated!.DisplayName);
        Assert.Equal("https://example.com/avatar.png", updated.AvatarUrl);
        Assert.Equal("updated@example.com", updated.Email);
        Assert.True(updated.EmailConfirmed);
        Assert.True(updated.PhoneNumberConfirmed);
        Assert.True(updated.TwoFactorEnabled);
        var updatedRoles = await userManager.GetRolesAsync(updated);
        Assert.Contains("Reviewer", updatedRoles);
        Assert.Contains("Staff", updatedRoles);
        Assert.DoesNotContain("Editor", updatedRoles);
    }

    [Fact]
    public async Task PatchUser_InvalidPayload_ReturnsBadRequest()
    {
        var target = await CreateUserAsync("patch-invalid");

        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);

        var payload = new { roles = "not-an-array" };
        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{target.Id}")
        {
            Content = JsonContent.Create(payload)
        };

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("USER_INVALID_PAYLOAD", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PatchUser_NotFound_ReturnsNotFound()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);

        var request = new HttpRequestMessage(HttpMethod.Patch, "/api/users/does-not-exist")
        {
            Content = JsonContent.Create(new { displayName = "irrelevant" })
        };

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("USER_NOT_FOUND", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task LockUser_Admin_CanLockAndUnlock()
    {
        var target = await CreateUserAsync("lock-target");

        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);

        var lockUntil = DateTimeOffset.UtcNow.AddHours(1);
        var lockResponse = await client.PostAsJsonAsync($"/api/users/{target.Id}/lock", new { Until = lockUntil });

        Assert.Equal(HttpStatusCode.OK, lockResponse.StatusCode);
        var lockJson = await lockResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(lockJson.GetProperty("data").GetProperty("lockoutEnd").GetDateTimeOffset() >= lockUntil.AddMinutes(-1));

        var unlockResponse = await client.PostAsJsonAsync($"/api/users/{target.Id}/lock", new { Unlock = true });
        Assert.Equal(HttpStatusCode.OK, unlockResponse.StatusCode);
        var unlockJson = await unlockResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Null, unlockJson.GetProperty("data").GetProperty("lockoutEnd").ValueKind);

        using var verificationScope = factory.Services.CreateScope();
        var userManager = verificationScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var updated = await userManager.FindByIdAsync(target.Id);
        Assert.NotNull(updated);
        Assert.Null(updated!.LockoutEnd);
    }

    [Fact]
    public async Task DeleteUser_Admin_SoftDeletesUser()
    {
        var target = await CreateUserAsync("delete-target");

        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);

        var response = await client.DeleteAsync($"/api/users/{target.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data");
        Assert.True(data.GetProperty("isDeleted").GetBoolean());

        using var verificationScope = factory.Services.CreateScope();
        var userManager = verificationScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var deleted = await userManager.FindByIdAsync(target.Id);
        Assert.NotNull(deleted);
        Assert.True(deleted!.IsDeleted);
        Assert.True(deleted.LockoutEnabled);
        Assert.Equal(DateTimeOffset.MaxValue, deleted.LockoutEnd);
    }

    private async Task<ApplicationUser> CreateUserAsync(string userNamePrefix, bool emailConfirmed = false, bool phoneConfirmed = false, bool isDeleted = false, IEnumerable<string>? roles = null)
    {
        using var scope = factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        var user = new ApplicationUser
        {
            UserName = $"{userNamePrefix}-{Guid.NewGuid():N}",
            Email = $"{userNamePrefix}-{Guid.NewGuid():N}@example.com",
            EmailConfirmed = emailConfirmed,
            PhoneNumberConfirmed = phoneConfirmed,
            CreatedAtUtc = DateTime.UtcNow,
            IsDeleted = isDeleted
        };

        var result = await userManager.CreateAsync(user, DefaultPassword);
        Assert.True(result.Succeeded, string.Join(",", result.Errors.Select(e => e.Description)));

        if (roles?.Any() == true)
        {
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    var createRole = await roleManager.CreateAsync(new IdentityRole(role));
                    Assert.True(createRole.Succeeded, string.Join(",", createRole.Errors.Select(e => e.Description)));
                }
            }

            var roleResult = await userManager.AddToRolesAsync(user, roles);
            Assert.True(roleResult.Succeeded, string.Join(",", roleResult.Errors.Select(e => e.Description)));
        }

        if (isDeleted)
        {
            var updateResult = await userManager.UpdateAsync(user);
            Assert.True(updateResult.Succeeded, string.Join(",", updateResult.Errors.Select(e => e.Description)));
        }

        return user;
    }
}
