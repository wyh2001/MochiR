using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Tests.Endpoints;

public sealed class FeedEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory factory;

    public FeedEndpointsTests(CustomWebApplicationFactory factory)
    {
        this.factory = factory;
    }

    [Fact]
    public async Task GetFeed_ReturnsReviewsFromFollowedUsers()
    {
        using var client = factory.CreateClientWithCookies();
        var me = await client.SignInAsUserAsync(factory);
        var author = await CreateUserAsync();
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType);

        await CreateFollowAsync(me.Id, FollowTargetType.User, followedUserId: author.Id);
        var review = await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow, "Followed user review");

        var response = await client.GetAsync("/api/feed");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(1, data.GetProperty("totalCount").GetInt32());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Single(items);
        var item = items[0];
        Assert.Equal(review.Id, item.GetProperty("reviewId").GetInt64());
        Assert.Equal(author.Id, item.GetProperty("authorId").GetString());
    }

    [Fact]
    public async Task GetFeed_FiltersBySubjectAndSubjectType()
    {
        using var client = factory.CreateClientWithCookies();
        var me = await client.SignInAsUserAsync(factory);
        var followedType = await CreateSubjectTypeAsync();
        var otherType = await CreateSubjectTypeAsync();
        var followedSubject = await CreateSubjectAsync(followedType);
        var typeSubject = await CreateSubjectAsync(followedType);
        var otherSubject = await CreateSubjectAsync(otherType);
        var author = await CreateUserAsync();

        await CreateFollowAsync(me.Id, FollowTargetType.Subject, subjectId: followedSubject.Id);
        await CreateFollowAsync(me.Id, FollowTargetType.SubjectType, subjectTypeId: followedType.Id);

        var includedReview = await CreateReviewAsync(author.Id, followedSubject.Id, DateTime.UtcNow.AddMinutes(-1), "Subject follow");
        var typeReview = await CreateReviewAsync(author.Id, typeSubject.Id, DateTime.UtcNow.AddMinutes(-2), "Subject type follow");
        var excludedReview = await CreateReviewAsync(author.Id, otherSubject.Id, DateTime.UtcNow, "Should not appear");

        var response = await client.GetAsync("/api/feed?pageSize=5");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = json.GetProperty("data").GetProperty("items").EnumerateArray().ToList();
        var reviewIds = items.Select(i => i.GetProperty("reviewId").GetInt64()).ToList();
        Assert.Contains(includedReview.Id, reviewIds);
        Assert.Contains(typeReview.Id, reviewIds);
        Assert.Equal(2, items.Count);
        Assert.DoesNotContain(excludedReview.Id, reviewIds);
    }

    [Fact]
    public async Task GetFeed_WithNoFollows_ReturnsEmptyList()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var response = await client.GetAsync("/api/feed");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data");
        Assert.Equal(0, data.GetProperty("totalCount").GetInt32());
        Assert.Empty(data.GetProperty("items").EnumerateArray());
        Assert.False(data.GetProperty("hasMore").GetBoolean());
        Assert.Equal(JsonValueKind.Null, data.GetProperty("nextCursor").ValueKind);
    }

    [Fact]
    public async Task GetFeed_InvalidPagination_ReturnsBadRequest()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var response = await client.GetAsync("/api/feed?page=0");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("FEED_INVALID_QUERY", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task GetFeed_InvalidCursor_ReturnsBadRequest()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var response = await client.GetAsync("/api/feed?afterId=0");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("FEED_INVALID_QUERY", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task GetFeed_WithCursor_ReturnsOlderEntries()
    {
        using var client = factory.CreateClientWithCookies();
        var me = await client.SignInAsUserAsync(factory);
        var author = await CreateUserAsync();
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType);

        await CreateFollowAsync(me.Id, FollowTargetType.User, followedUserId: author.Id);

        var newest = await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow, "Newest");
        var middle = await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow.AddMinutes(-1), "Middle");
        var oldest = await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow.AddMinutes(-2), "Oldest");

        var firstResponse = await client.GetAsync("/api/feed?pageSize=2");
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        var firstJson = await firstResponse.Content.ReadFromJsonAsync<JsonElement>();
        var firstData = firstJson.GetProperty("data");
        Assert.True(firstData.GetProperty("hasMore").GetBoolean());
        var firstItems = firstData.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(2, firstItems.Count);
        Assert.Equal(newest.Id, firstItems[0].GetProperty("reviewId").GetInt64());
        Assert.Equal(middle.Id, firstItems[1].GetProperty("reviewId").GetInt64());

        var cursor = firstData.GetProperty("nextCursor");
        var cursorTime = cursor.GetProperty("createdAtUtc").GetDateTime();
        var cursorId = cursor.GetProperty("reviewId").GetInt64();
        var cursorQuery = $"/api/feed?pageSize=2&after={Uri.EscapeDataString(cursorTime.ToString("O"))}&afterId={cursorId}";

        var secondResponse = await client.GetAsync(cursorQuery);
        Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);
        var secondJson = await secondResponse.Content.ReadFromJsonAsync<JsonElement>();
        var secondItems = secondJson.GetProperty("data").GetProperty("items").EnumerateArray().ToList();
        Assert.Single(secondItems);
        Assert.Equal(oldest.Id, secondItems[0].GetProperty("reviewId").GetInt64());
        Assert.False(secondJson.GetProperty("data").GetProperty("hasMore").GetBoolean());
    }

    [Fact]
    public async Task GetFeed_WithoutAuthentication_ReturnsUnauthorized()
    {
        using var client = factory.CreateClientWithCookies();

        var response = await client.GetAsync("/api/feed");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
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

    private async Task CreateFollowAsync(
        string followerId,
        FollowTargetType targetType,
        int? subjectId = null,
        int? subjectTypeId = null,
        string? followedUserId = null)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var follow = new Follow
        {
            FollowerId = followerId,
            TargetType = targetType,
            SubjectId = subjectId,
            SubjectTypeId = subjectTypeId,
            FollowedUserId = followedUserId,
            CreatedAtUtc = DateTime.UtcNow
        };

        db.Follows.Add(follow);
        await db.SaveChangesAsync();
    }

    private async Task<Review> CreateReviewAsync(string authorId, int subjectId, DateTime createdAt, string title)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var review = new Review
        {
            SubjectId = subjectId,
            UserId = authorId,
            Title = title,
            Content = $"Content for {title}",
            Status = ReviewStatus.Approved,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
            IsDeleted = false
        };

        db.Reviews.Add(review);
        await db.SaveChangesAsync();
        return review;
    }
}
