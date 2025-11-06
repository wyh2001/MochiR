using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Tests.Endpoints;

public sealed class ReviewsLatestEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory factory;

    public ReviewsLatestEndpointsTests(CustomWebApplicationFactory factory)
    {
        this.factory = factory;
    }

    [Fact]
    public async Task GetLatestReviews_ReturnsApprovedReviewsInDescendingOrder()
    {
        using var client = factory.CreateClient();
        var baseline = await GetLatestTotalCountAsync(client);
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType);
        var author = await CreateUserAsync();

        var newest = await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow, "Newest review");
        var older = await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow.AddMinutes(-5), "Older review");
        await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow.AddMinutes(-10), "Pending review", ReviewStatus.Pending);
        await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow.AddMinutes(-15), "Deleted review", ReviewStatus.Approved, isDeleted: true);

        var response = await client.GetAsync("/api/reviews/latest");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(baseline + 2, data.GetProperty("totalCount").GetInt32());
        Assert.False(data.GetProperty("hasMore").GetBoolean());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.True(items.Count >= 2);
        var itemIds = items.Select(i => i.GetProperty("id").GetInt64()).ToList();
        Assert.Contains(newest.Id, itemIds);
        Assert.Contains(older.Id, itemIds);
        var newestIndex = itemIds.IndexOf(newest.Id);
        var olderIndex = itemIds.IndexOf(older.Id);
        Assert.True(newestIndex >= 0 && olderIndex >= 0 && newestIndex < olderIndex);
    }

    [Fact]
    public async Task GetLatestReviews_RespectsPageSizeAndHasMore()
    {
        using var client = factory.CreateClient();
        var baseline = await GetLatestTotalCountAsync(client);
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType);
        var author = await CreateUserAsync();

        var first = await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow, "First");
        await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow.AddMinutes(-1), "Second");

        var response = await client.GetAsync("/api/reviews/latest?pageSize=1");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(baseline + 2, data.GetProperty("totalCount").GetInt32());
        Assert.True(data.GetProperty("hasMore").GetBoolean());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.True(items.Count >= 1);
        Assert.Equal(first.Id, items[0].GetProperty("id").GetInt64());
    }

    [Fact]
    public async Task GetLatestReviews_InvalidQueryReturnsBadRequest()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/reviews/latest?page=0");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("REVIEW_INVALID_QUERY", json.GetProperty("error").GetProperty("code").GetString());
    }

    private static async Task<int> GetLatestTotalCountAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/reviews/latest");
        if (response.StatusCode != HttpStatusCode.OK)
        {
            return 0;
        }

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        if (!json.GetProperty("success").GetBoolean())
        {
            return 0;
        }

        return json.GetProperty("data").GetProperty("totalCount").GetInt32();
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

    private async Task<Review> CreateReviewAsync(
        string authorId,
        int subjectId,
        DateTime createdAt,
        string title,
        ReviewStatus status = ReviewStatus.Approved,
        bool isDeleted = false)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var review = new Review
        {
            SubjectId = subjectId,
            UserId = authorId,
            Title = title,
            Content = $"Content for {title}",
            Status = status,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
            IsDeleted = isDeleted,
            MediaCount = 0
        };

        db.Reviews.Add(review);
        await db.SaveChangesAsync();
        return review;
    }
}
