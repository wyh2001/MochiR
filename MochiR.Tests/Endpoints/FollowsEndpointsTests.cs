using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Tests.Endpoints;

public sealed class FollowsEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory factory;

    public FollowsEndpointsTests(CustomWebApplicationFactory factory)
    {
        this.factory = factory;
    }

    [Fact]
    public async Task FollowSubject_Succeeds()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType);

        using var client = factory.CreateClientWithCookies();
        var follower = await client.SignInAsUserAsync(factory);

        var response = await client.PostAsync($"/api/follows/subjects/{subject.Id}", null);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(subject.Id, data.GetProperty("subjectId").GetInt32());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var follow = await db.Follows.AsNoTracking().FirstOrDefaultAsync(f =>
            f.FollowerId == follower.Id &&
            f.TargetType == FollowTargetType.Subject &&
            f.SubjectId == subject.Id);
        Assert.NotNull(follow);
    }

    [Fact]
    public async Task FollowSubject_Duplicate_ReturnsConflict()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType);

        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var firstResponse = await client.PostAsync($"/api/follows/subjects/{subject.Id}", null);
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);

        var response = await client.PostAsync($"/api/follows/subjects/{subject.Id}", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("FOLLOW_ALREADY_EXISTS", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task FollowSubject_NotFound_ReturnsNotFound()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var response = await client.PostAsync("/api/follows/subjects/999999", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("FOLLOW_TARGET_NOT_FOUND", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task FollowSubject_WithoutAuthentication_ReturnsUnauthorized()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType);

        using var client = factory.CreateClientWithCookies();

        var response = await client.PostAsync($"/api/follows/subjects/{subject.Id}", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DeleteSubjectFollow_NotFound_ReturnsFailure()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType);

        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var response = await client.DeleteAsync($"/api/follows/subjects/{subject.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("FOLLOW_NOT_FOUND", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task DeleteSubjectFollow_RemovesFollow()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType);

        using var client = factory.CreateClientWithCookies();
        var follower = await client.SignInAsUserAsync(factory);

        var createResponse = await client.PostAsync($"/api/follows/subjects/{subject.Id}", null);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var response = await client.DeleteAsync($"/api/follows/subjects/{subject.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        Assert.True(json.GetProperty("data").GetProperty("removed").GetBoolean());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var follow = await db.Follows.AsNoTracking().FirstOrDefaultAsync(f =>
            f.FollowerId == follower.Id &&
            f.TargetType == FollowTargetType.Subject &&
            f.SubjectId == subject.Id);
        Assert.Null(follow);
    }

    [Fact]
    public async Task GetFollowedSubjects_ReturnsPaginatedList()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var first = await CreateSubjectAsync(subjectType);
        var second = await CreateSubjectAsync(subjectType);

        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var firstResponse = await client.PostAsync($"/api/follows/subjects/{first.Id}", null);
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);
        var secondResponse = await client.PostAsync($"/api/follows/subjects/{second.Id}", null);
        Assert.Equal(HttpStatusCode.Created, secondResponse.StatusCode);

        var response = await client.GetAsync("/api/follows/subjects");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(2, data.GetProperty("totalCount").GetInt32());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(2, items.Count);
        var subjectIds = items.Select(item => item.GetProperty("subjectId").GetInt32()).ToList();
        Assert.Contains(first.Id, subjectIds);
        Assert.Contains(second.Id, subjectIds);
    }

    [Fact]
    public async Task FollowSubjectType_Succeeds()
    {
        var subjectType = await CreateSubjectTypeAsync();

        using var client = factory.CreateClientWithCookies();
        var follower = await client.SignInAsUserAsync(factory);

        var response = await client.PostAsync($"/api/follows/subject-types/{subjectType.Id}", null);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(subjectType.Id, data.GetProperty("subjectTypeId").GetInt32());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var follow = await db.Follows.AsNoTracking().FirstOrDefaultAsync(f =>
            f.FollowerId == follower.Id &&
            f.TargetType == FollowTargetType.SubjectType &&
            f.SubjectTypeId == subjectType.Id);
        Assert.NotNull(follow);
    }

    [Fact]
    public async Task FollowSubjectType_Duplicate_ReturnsConflict()
    {
        var subjectType = await CreateSubjectTypeAsync();

        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var firstResponse = await client.PostAsync($"/api/follows/subject-types/{subjectType.Id}", null);
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);

        var response = await client.PostAsync($"/api/follows/subject-types/{subjectType.Id}", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("FOLLOW_ALREADY_EXISTS", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task FollowSubjectType_NotFound_ReturnsNotFound()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var response = await client.PostAsync("/api/follows/subject-types/999999", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("FOLLOW_TARGET_NOT_FOUND", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task FollowSubjectType_WithoutAuthentication_ReturnsUnauthorized()
    {
        var subjectType = await CreateSubjectTypeAsync();

        using var client = factory.CreateClientWithCookies();

        var response = await client.PostAsync($"/api/follows/subject-types/{subjectType.Id}", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DeleteSubjectTypeFollow_NotFound_ReturnsFailure()
    {
        var subjectType = await CreateSubjectTypeAsync();

        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var response = await client.DeleteAsync($"/api/follows/subject-types/{subjectType.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("FOLLOW_NOT_FOUND", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task DeleteSubjectTypeFollow_RemovesFollow()
    {
        var subjectType = await CreateSubjectTypeAsync();

        using var client = factory.CreateClientWithCookies();
        var follower = await client.SignInAsUserAsync(factory);

        var createResponse = await client.PostAsync($"/api/follows/subject-types/{subjectType.Id}", null);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var response = await client.DeleteAsync($"/api/follows/subject-types/{subjectType.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        Assert.True(json.GetProperty("data").GetProperty("removed").GetBoolean());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var follow = await db.Follows.AsNoTracking().FirstOrDefaultAsync(f =>
            f.FollowerId == follower.Id &&
            f.TargetType == FollowTargetType.SubjectType &&
            f.SubjectTypeId == subjectType.Id);
        Assert.Null(follow);
    }

    [Fact]
    public async Task GetFollowedSubjectTypes_ReturnsPaginatedList()
    {
        var firstType = await CreateSubjectTypeAsync();
        var secondType = await CreateSubjectTypeAsync();

        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var firstResponse = await client.PostAsync($"/api/follows/subject-types/{firstType.Id}", null);
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);
        var secondResponse = await client.PostAsync($"/api/follows/subject-types/{secondType.Id}", null);
        Assert.Equal(HttpStatusCode.Created, secondResponse.StatusCode);

        var response = await client.GetAsync("/api/follows/subject-types");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(2, data.GetProperty("totalCount").GetInt32());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(2, items.Count);
        var subjectTypeIds = items.Select(item => item.GetProperty("subjectTypeId").GetInt32()).ToList();
        Assert.Contains(firstType.Id, subjectTypeIds);
        Assert.Contains(secondType.Id, subjectTypeIds);
    }

    [Fact]
    public async Task GetFollowedUsers_ReturnsPaginatedList()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);
        var first = await CreateUserAsync();
        var second = await CreateUserAsync();

        var firstResponse = await client.PostAsync($"/api/follows/users/{first.Id}", null);
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);
        var secondResponse = await client.PostAsync($"/api/follows/users/{second.Id}", null);
        Assert.Equal(HttpStatusCode.Created, secondResponse.StatusCode);

        var response = await client.GetAsync("/api/follows/users");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(2, data.GetProperty("totalCount").GetInt32());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        var userIds = items.Select(item => item.GetProperty("userId").GetString()).ToList();
        Assert.Contains(first.Id, userIds);
        Assert.Contains(second.Id, userIds);
    }

    [Fact]
    public async Task GetFollowedUsers_WithoutAuthentication_ReturnsUnauthorized()
    {
        using var client = factory.CreateClientWithCookies();

        var response = await client.GetAsync("/api/follows/users");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task FollowUser_Succeeds()
    {
        using var client = factory.CreateClientWithCookies();
        var follower = await client.SignInAsUserAsync(factory);
        var target = await CreateUserAsync();

        var response = await client.PostAsync($"/api/follows/users/{target.Id}", null);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(target.Id, data.GetProperty("userId").GetString());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var follow = await db.Follows.AsNoTracking().FirstOrDefaultAsync(f =>
            f.FollowerId == follower.Id &&
            f.TargetType == FollowTargetType.User &&
            f.FollowedUserId == target.Id);
        Assert.NotNull(follow);
    }

    [Fact]
    public async Task FollowUser_Duplicate_ReturnsConflict()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);
        var target = await CreateUserAsync();

        var firstResponse = await client.PostAsync($"/api/follows/users/{target.Id}", null);
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);

        var response = await client.PostAsync($"/api/follows/users/{target.Id}", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("FOLLOW_ALREADY_EXISTS", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task FollowUser_Self_ReturnsBadRequest()
    {
        using var client = factory.CreateClientWithCookies();
        var me = await client.SignInAsUserAsync(factory);

        var response = await client.PostAsync($"/api/follows/users/{me.Id}", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("FOLLOW_SELF_FORBIDDEN", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task FollowUser_NotFound_ReturnsNotFound()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var response = await client.PostAsync("/api/follows/users/unknown-user", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("FOLLOW_TARGET_NOT_FOUND", json.GetProperty("error").GetProperty("code").GetString());
    }

    private async Task<SubjectType> CreateSubjectTypeAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var subjectType = new SubjectType
        {
            Key = $"type-{Guid.NewGuid():N}",
            DisplayName = $"Type {Guid.NewGuid():N}"
        };

        db.SubjectTypes.Add(subjectType);
        await db.SaveChangesAsync();
        return subjectType;
    }

    private async Task<Subject> CreateSubjectAsync(SubjectType subjectType)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var subject = new Subject
        {
            SubjectTypeId = subjectType.Id,
            Name = $"Subject {Guid.NewGuid():N}",
            Slug = $"subject-{Guid.NewGuid():N}",
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        db.Subjects.Add(subject);
        await db.SaveChangesAsync();
        return subject;
    }

    private async Task<ApplicationUser> CreateUserAsync()
    {
        using var scope = factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = new ApplicationUser
        {
            UserName = $"user-{Guid.NewGuid():N}",
            Email = $"user-{Guid.NewGuid():N}@example.com",
            EmailConfirmed = true,
            LockoutEnabled = false
        };

        var result = await userManager.CreateAsync(user);
        Assert.True(result.Succeeded, string.Join(",", result.Errors.Select(e => e.Description)));
        return user;
    }
}
