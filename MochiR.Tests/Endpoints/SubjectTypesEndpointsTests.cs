using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Tests.Endpoints;

public sealed class SubjectTypesEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory factory;

    public SubjectTypesEndpointsTests(CustomWebApplicationFactory factory)
    {
        this.factory = factory;
    }

    [Fact]
    public async Task GetSubjectTypes_ReturnsExistingTypes()
    {
        await CreateSubjectTypeAsync("list-a");
        await CreateSubjectTypeAsync("list-b");

        using var client = factory.CreateClientWithCookies();
        var response = await client.GetAsync("/api/subject-types");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var items = json.GetProperty("data").EnumerateArray().ToList();
        Assert.Contains(items, item => item.GetProperty("key").GetString() == "list-a");
        Assert.Contains(items, item => item.GetProperty("key").GetString() == "list-b");
    }

    [Fact]
    public async Task PostSubjectType_WithoutAuthentication_ReturnsUnauthorized()
    {
        using var client = factory.CreateClientWithCookies();
        var payload = new { Key = "unauthorized", DisplayName = "Unauthorized", Settings = Array.Empty<object>() };

        var response = await client.PostAsJsonAsync("/api/subject-types", payload);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostSubjectType_WithNonAdminUser_ReturnsForbidden()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);
        var payload = new { Key = "forbidden", DisplayName = "Forbidden", Settings = Array.Empty<object>() };

        var response = await client.PostAsJsonAsync("/api/subject-types", payload);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PostSubjectType_InvalidPayload_ReturnsBadRequest()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);
        var payload = new { Key = " ", DisplayName = "", Settings = Array.Empty<object>() };

        var response = await client.PostAsJsonAsync("/api/subject-types", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("SUBJECT_TYPE_INVALID_INPUT", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PostSubjectType_DuplicateKey_ReturnsConflict()
    {
        await CreateSubjectTypeAsync("duplicate-key");
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);
        var payload = new { Key = "duplicate-key", DisplayName = "Duplicate", Settings = Array.Empty<object>() };

        var response = await client.PostAsJsonAsync("/api/subject-types", payload);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("SUBJECT_TYPE_DUPLICATE_KEY", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PostSubjectType_SucceedsForAdmin()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);
        var payload = new
        {
            Key = "created-key",
            DisplayName = "Created",
            Settings = new[]
            {
                new { Key = "campus", Value = "Main", Note = (string?)"default" }
            }
        };

        var response = await client.PostAsJsonAsync("/api/subject-types", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        var subjectTypeId = data.GetProperty("id").GetInt32();
        Assert.Equal("created-key", data.GetProperty("key").GetString());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var subjectType = await db.SubjectTypes.Include(st => st.Settings).FirstAsync(st => st.Id == subjectTypeId);
        Assert.Equal("Created", subjectType.DisplayName);
        Assert.Single(subjectType.Settings);
        Assert.Equal("campus", subjectType.Settings.First().Key);
    }

    [Fact]
    public async Task PutSubjectType_WithoutAuthentication_ReturnsUnauthorized()
    {
        var subjectType = await CreateSubjectTypeAsync("update-original");
        using var client = factory.CreateClientWithCookies();
        var payload = new { Key = "updated", DisplayName = "Updated", Settings = Array.Empty<object>() };

        var response = await client.PutAsJsonAsync($"/api/subject-types/{subjectType.Id}", payload);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PutSubjectType_WithNonAdminUser_ReturnsForbidden()
    {
        var subjectType = await CreateSubjectTypeAsync("update-original");
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);
        var payload = new { Key = "updated", DisplayName = "Updated", Settings = Array.Empty<object>() };

        var response = await client.PutAsJsonAsync($"/api/subject-types/{subjectType.Id}", payload);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PutSubjectType_NotFound_ReturnsFailure()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);
        var payload = new { Key = "updated", DisplayName = "Updated", Settings = Array.Empty<object>() };

        var response = await client.PutAsJsonAsync("/api/subject-types/999999", payload);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("SUBJECT_TYPE_NOT_FOUND", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PutSubjectType_InvalidPayload_ReturnsBadRequest()
    {
        var subjectType = await CreateSubjectTypeAsync("update-invalid");
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);
        var payload = new { Key = " ", DisplayName = "", Settings = Array.Empty<object>() };

        var response = await client.PutAsJsonAsync($"/api/subject-types/{subjectType.Id}", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("SUBJECT_TYPE_INVALID_INPUT", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PutSubjectType_DuplicateKey_ReturnsConflict()
    {
        var subjectType = await CreateSubjectTypeAsync("update-original");
        await CreateSubjectTypeAsync("existing-key");
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);
        var payload = new { Key = "existing-key", DisplayName = "Updated", Settings = Array.Empty<object>() };

        var response = await client.PutAsJsonAsync($"/api/subject-types/{subjectType.Id}", payload);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("SUBJECT_TYPE_DUPLICATE_KEY", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PutSubjectType_SucceedsForAdmin()
    {
        var subjectType = await CreateSubjectTypeAsync("update-original", withSettings: true);
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);
        var payload = new
        {
            Key = "updated-key",
            DisplayName = "Updated",
            Settings = new[]
            {
                new { Key = "campus", Value = "East", Note = (string?)"override" },
                new { Key = "size", Value = "Large", Note = (string?)null }
            }
        };

        var response = await client.PutAsJsonAsync($"/api/subject-types/{subjectType.Id}", payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal("updated-key", data.GetProperty("key").GetString());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var updated = await db.SubjectTypes.Include(st => st.Settings).FirstAsync(st => st.Id == subjectType.Id);
        Assert.Equal("Updated", updated.DisplayName);
        Assert.Equal(2, updated.Settings.Count);
        Assert.Contains(updated.Settings, setting => setting.Key == "campus" && setting.Value == "East");
        Assert.Contains(updated.Settings, setting => setting.Key == "size" && setting.Value == "Large");
    }

    [Fact]
    public async Task DeleteSubjectType_WithoutAuthentication_ReturnsUnauthorized()
    {
        var subjectType = await CreateSubjectTypeAsync("delete-target");
        using var client = factory.CreateClientWithCookies();

        var response = await client.DeleteAsync($"/api/subject-types/{subjectType.Id}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DeleteSubjectType_WithNonAdminUser_ReturnsForbidden()
    {
        var subjectType = await CreateSubjectTypeAsync("delete-target");
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var response = await client.DeleteAsync($"/api/subject-types/{subjectType.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteSubjectType_NotFound_ReturnsFailure()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);

        var response = await client.DeleteAsync("/api/subject-types/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("SUBJECT_TYPE_NOT_FOUND", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task DeleteSubjectType_InUse_ReturnsConflict()
    {
        var subjectType = await CreateSubjectTypeAsync("delete-in-use");
        await CreateSubjectAsync(subjectType.Id);
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);

        var response = await client.DeleteAsync($"/api/subject-types/{subjectType.Id}");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("SUBJECT_TYPE_IN_USE", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task DeleteSubjectType_SucceedsForAdmin()
    {
        var subjectType = await CreateSubjectTypeAsync("delete-success");
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);

        var response = await client.DeleteAsync($"/api/subject-types/{subjectType.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        Assert.True(json.GetProperty("data").GetProperty("deleted").GetBoolean());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var exists = await db.SubjectTypes.AnyAsync(st => st.Id == subjectType.Id);
        Assert.False(exists);
    }

    private async Task<SubjectType> CreateSubjectTypeAsync(string key, bool withSettings = false)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var subjectType = new SubjectType
        {
            Key = key,
            DisplayName = $"Display {key}",
            Settings = withSettings
                ? new List<SubjectTypeSetting>
                {
                    new() { Key = "campus", Value = "Main", Note = "seed" }
                }
                : new List<SubjectTypeSetting>()
        };

        db.SubjectTypes.Add(subjectType);
        await db.SaveChangesAsync();
        return subjectType;
    }

    private async Task CreateSubjectAsync(int subjectTypeId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var subject = new Subject
        {
            Name = $"Subject {Guid.NewGuid():N}",
            Slug = $"subject-{Guid.NewGuid():N}",
            SubjectTypeId = subjectTypeId,
            CreatedAt = DateTime.UtcNow
        };

        db.Subjects.Add(subject);
        await db.SaveChangesAsync();
    }
}
