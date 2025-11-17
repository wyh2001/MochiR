using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Tests.Endpoints;

public sealed class SubjectsEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory factory;

    public SubjectsEndpointsTests(CustomWebApplicationFactory factory)
    {
        this.factory = factory;
    }

    [Fact]
    public async Task GetSubjects_ReturnsExistingSubjects()
    {
        var subjectType = await CreateSubjectTypeAsync();
        await CreateSubjectAsync(subjectType, "First Subject");
        await CreateSubjectAsync(subjectType, "Second Subject");

        using var client = factory.CreateClientWithCookies();
        var response = await client.GetAsync("/api/subjects");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var items = json.GetProperty("data").EnumerateArray().ToList();
        Assert.Contains(items, item => item.GetProperty("name").GetString() == "First Subject");
        Assert.Contains(items, item => item.GetProperty("name").GetString() == "Second Subject");
    }

    [Fact]
    public async Task GetSubjects_ExcludesDeletedSubjects()
    {
        var subjectType = await CreateSubjectTypeAsync();
        await CreateSubjectAsync(subjectType, "Active Subject");
        var deleted = await CreateSubjectAsync(subjectType, "Deleted Subject", isDeleted: true);

        using var client = factory.CreateClientWithCookies();
        var response = await client.GetAsync("/api/subjects");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = json.GetProperty("data").EnumerateArray().ToList();
        Assert.DoesNotContain(items, item => item.GetProperty("id").GetInt32() == deleted.Id);
    }

    [Fact]
    public async Task GetSubjectById_NotFound_ReturnsFailure()
    {
        using var client = factory.CreateClientWithCookies();

        var response = await client.GetAsync("/api/subjects/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("SUBJECT_NOT_FOUND", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task GetSubjectById_WhenDeleted_ReturnsNotFound()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType, "Deleted Subject", isDeleted: true);

        using var client = factory.CreateClientWithCookies();
        var response = await client.GetAsync($"/api/subjects/{subject.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("SUBJECT_NOT_FOUND", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task GetSubjectById_ReturnsDetail()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType, "Detailed Subject", attributes: new (string Key, string? Value, string? Note)[] { ("campus", "Main", "Primary") });

        using var client = factory.CreateClientWithCookies();
        var response = await client.GetAsync($"/api/subjects/{subject.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data");
        Assert.Equal(subject.Id, data.GetProperty("id").GetInt32());
        Assert.Equal(subject.Name, data.GetProperty("name").GetString());
        Assert.Equal(subjectType.Key, data.GetProperty("subjectTypeKey").GetString());
        var attributes = data.GetProperty("attributes").EnumerateArray().ToList();
        Assert.Single(attributes);
        Assert.Equal("campus", attributes[0].GetProperty("key").GetString());
        Assert.Equal("Main", attributes[0].GetProperty("value").GetString());
    }

    [Fact]
    public async Task PostSubject_WithoutAuthentication_ReturnsUnauthorized()
    {
        var subjectType = await CreateSubjectTypeAsync();
        using var client = factory.CreateClientWithCookies();
        var payload = new { Name = "Unauthorized", Slug = "unauthorized", SubjectTypeId = subjectType.Id };

        var response = await client.PostAsJsonAsync("/api/subjects", payload);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostSubject_WithNonAdminUser_ReturnsForbidden()
    {
        var subjectType = await CreateSubjectTypeAsync();
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);
        var payload = new { Name = "Forbidden", Slug = "forbidden", SubjectTypeId = subjectType.Id };

        var response = await client.PostAsJsonAsync("/api/subjects", payload);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PostSubject_InvalidPayload_ReturnsBadRequest()
    {
        var subjectType = await CreateSubjectTypeAsync();
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);
        var payload = new { Name = " ", Slug = "", SubjectTypeId = subjectType.Id };

        var response = await client.PostAsJsonAsync("/api/subjects", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("SUBJECT_INVALID_INPUT", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PostSubject_DuplicateSlug_ReturnsConflict()
    {
        var subjectType = await CreateSubjectTypeAsync();
        await CreateSubjectAsync(subjectType, "Existing", slug: "existing-slug");
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);
        var payload = new { Name = "Duplicate", Slug = "existing-slug", SubjectTypeId = subjectType.Id };

        var response = await client.PostAsJsonAsync("/api/subjects", payload);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("SUBJECT_DUPLICATE_SLUG", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PostSubject_SucceedsForAdmin()
    {
        var subjectType = await CreateSubjectTypeAsync();
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);
        var payload = new
        {
            Name = "Created Subject",
            Slug = "created-subject",
            SubjectTypeId = subjectType.Id,
            Attributes = new[]
            {
                new { Key = "campus", Value = "North", Note = "Main" }
            }
        };

        var response = await client.PostAsJsonAsync("/api/subjects", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        var subjectId = data.GetProperty("id").GetInt32();
        Assert.Equal(subjectType.Id, data.GetProperty("subjectTypeId").GetInt32());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var subject = await db.Subjects.Include(s => s.Attributes).FirstOrDefaultAsync(s => s.Id == subjectId);
        Assert.NotNull(subject);
        Assert.Equal("Created Subject", subject!.Name);
        Assert.Single(subject.Attributes);
        Assert.Equal("North", subject.Attributes.First().Value);
    }

    [Fact]
    public async Task PutSubject_WithoutAuthentication_ReturnsUnauthorized()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType, "Original Subject");
        using var client = factory.CreateClientWithCookies();
        var payload = new { Name = "Updated", Slug = "updated", SubjectTypeId = subjectType.Id, Attributes = Array.Empty<object>() };

        var response = await client.PutAsJsonAsync($"/api/subjects/{subject.Id}", payload);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PutSubject_WithNonAdminUser_ReturnsForbidden()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType, "Original Subject");
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);
        var payload = new { Name = "Updated", Slug = "updated", SubjectTypeId = subjectType.Id, Attributes = Array.Empty<object>() };

        var response = await client.PutAsJsonAsync($"/api/subjects/{subject.Id}", payload);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PutSubject_NotFound_ReturnsFailure()
    {
        var subjectType = await CreateSubjectTypeAsync();
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);
        var payload = new { Name = "Updated", Slug = "updated", SubjectTypeId = subjectType.Id, Attributes = Array.Empty<object>() };

        var response = await client.PutAsJsonAsync("/api/subjects/999999", payload);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("SUBJECT_NOT_FOUND", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PutSubject_InvalidPayload_ReturnsBadRequest()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType, "Original Subject");
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);
        var payload = new { Name = " ", Slug = "", SubjectTypeId = subjectType.Id, Attributes = Array.Empty<object>() };

        var response = await client.PutAsJsonAsync($"/api/subjects/{subject.Id}", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("SUBJECT_INVALID_INPUT", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PutSubject_DuplicateSlug_ReturnsConflict()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType, "Original Subject", slug: "original-slug");
        await CreateSubjectAsync(subjectType, "Existing Subject", slug: "existing-slug");
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);
        var payload = new { Name = "Updated", Slug = "existing-slug", SubjectTypeId = subjectType.Id, Attributes = Array.Empty<object>() };

        var response = await client.PutAsJsonAsync($"/api/subjects/{subject.Id}", payload);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("SUBJECT_DUPLICATE_SLUG", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PutSubject_SucceedsForAdmin()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var targetType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType, "Original Subject", slug: "original-slug", attributes: new (string Key, string? Value, string? Note)[] { ("campus", "Main", "Primary") });
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);
        var payload = new
        {
            Name = "Updated Subject",
            Slug = "updated-subject",
            SubjectTypeId = targetType.Id,
            Attributes = new[]
            {
                new { Key = "campus", Value = "East", Note = (string?)"Main" },
                new { Key = "size", Value = "Large", Note = (string?)null }
            }
        };

        var response = await client.PutAsJsonAsync($"/api/subjects/{subject.Id}", payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal("updated-subject", data.GetProperty("slug").GetString());
        Assert.Equal(targetType.Id, data.GetProperty("subjectTypeId").GetInt32());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var updated = await db.Subjects.Include(s => s.Attributes).FirstAsync(s => s.Id == subject.Id);
        Assert.Equal("Updated Subject", updated.Name);
        Assert.Equal("updated-subject", updated.Slug);
        Assert.Equal(targetType.Id, updated.SubjectTypeId);
        Assert.Equal(2, updated.Attributes.Count);
        Assert.Contains(updated.Attributes, attr => attr.Key == "campus" && attr.Value == "East");
        Assert.Contains(updated.Attributes, attr => attr.Key == "size" && attr.Value == "Large");
    }

    [Fact]
    public async Task DeleteSubject_WithoutAuthentication_ReturnsUnauthorized()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType, "Target Subject");
        using var client = factory.CreateClientWithCookies();

        var response = await client.DeleteAsync($"/api/subjects/{subject.Id}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DeleteSubject_WithNonAdminUser_ReturnsForbidden()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType, "Target Subject");
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var response = await client.DeleteAsync($"/api/subjects/{subject.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteSubject_NotFound_ReturnsFailure()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);

        var response = await client.DeleteAsync("/api/subjects/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("SUBJECT_NOT_FOUND", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task DeleteSubject_SoftDeletesSubjectAndRelatedData()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType, "Target Subject");
        await CreateAggregateAsync(subject.Id);
        var user = await CreateUserAsync();
        await CreateReviewAsync(subject.Id, user.Id);

        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);

        var response = await client.DeleteAsync($"/api/subjects/{subject.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        Assert.True(json.GetProperty("data").GetProperty("deleted").GetBoolean());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var deletedSubject = await db.Subjects.FirstAsync(s => s.Id == subject.Id);
        Assert.True(deletedSubject.IsDeleted);

        var aggregateExists = await db.Aggregates.AnyAsync(a => a.SubjectId == subject.Id);
        Assert.False(aggregateExists);

        var reviews = await db.Reviews.Where(r => r.SubjectId == subject.Id).ToListAsync();
        Assert.All(reviews, review =>
        {
            Assert.True(review.IsDeleted);
            Assert.Equal(ReviewStatus.Pending, review.Status);
        });

        var detailResponse = await client.GetAsync($"/api/subjects/{subject.Id}");
        Assert.Equal(HttpStatusCode.NotFound, detailResponse.StatusCode);

        var listResponse = await client.GetAsync("/api/subjects");
        var listJson = await listResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.DoesNotContain(listJson.GetProperty("data").EnumerateArray(), item => item.GetProperty("id").GetInt32() == subject.Id);
    }

    private async Task<SubjectType> CreateSubjectTypeAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var subjectType = new SubjectType
        {
            Key = $"type-{Guid.NewGuid():N}",
            DisplayName = "Subject Type"
        };

        db.SubjectTypes.Add(subjectType);
        await db.SaveChangesAsync();
        return subjectType;
    }

    private async Task<Subject> CreateSubjectAsync(
        SubjectType subjectType,
        string name,
        string? slug = null,
        IEnumerable<(string Key, string? Value, string? Note)>? attributes = null,
        bool isDeleted = false)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var attributeList = attributes?.Select(tuple => new SubjectAttribute
        {
            Key = tuple.Key,
            Value = tuple.Value,
            Note = tuple.Note
        })?.ToList() ?? new List<SubjectAttribute>();

        var subject = new Subject
        {
            Name = name,
            Slug = slug ?? $"{name.ToLowerInvariant().Replace(' ', '-')}-{Guid.NewGuid():N}",
            SubjectTypeId = subjectType.Id,
            Attributes = attributeList,
            IsDeleted = isDeleted,
            CreatedAt = DateTime.UtcNow
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
            Email = $"{Guid.NewGuid():N}@example.com",
            EmailConfirmed = true,
            LockoutEnabled = false
        };

        var result = await userManager.CreateAsync(user, "Valid123!");
        Assert.True(result.Succeeded, string.Join(",", result.Errors.Select(e => e.Description)));
        return user;
    }

    private async Task CreateReviewAsync(int subjectId, string userId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var review = new Review
        {
            SubjectId = subjectId,
            UserId = userId,
            Title = "Seed Review",
            Content = "Content",
            Status = ReviewStatus.Approved,
            Ratings = new List<ReviewRating>
            {
                new() { Key = "quality", Score = 4.5m, Label = "Great" }
            },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        db.Reviews.Add(review);
        await db.SaveChangesAsync();
    }

    private async Task CreateAggregateAsync(int subjectId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var aggregate = new Aggregate
        {
            SubjectId = subjectId,
            CountReviews = 3,
            AvgOverall = 4.0m,
            Metrics = new List<AggregateMetric>
            {
                new() { Key = "quality", Value = 4.0m, Count = 3, Note = "seed" }
            },
            UpdatedAt = DateTime.UtcNow
        };

        db.Aggregates.Add(aggregate);
        await db.SaveChangesAsync();
    }
}
