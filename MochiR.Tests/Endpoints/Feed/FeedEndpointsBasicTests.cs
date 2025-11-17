using System.Text.Json;
using MochiR.Api.Entities;
using MochiR.Tests.Helpers;

namespace MochiR.Tests.Endpoints.Feed;

public sealed class FeedEndpointsBasicTests : IClassFixture<IsolatedDbWebApplicationFactory>, IAsyncLifetime
{
    private readonly IsolatedDbWebApplicationFactory factory;

    public FeedEndpointsBasicTests(IsolatedDbWebApplicationFactory factory)
    {
        this.factory = factory;
    }

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetFeed_WithFollowedUsers_ReturnsExpectedItems()
    {
        // Arrange
        using var client = factory.CreateClientWithCookies();
        var me = await client.SignInAsUserAsync(factory);
        var author = await factory.CreateUserAsync();
        var subjectType = await factory.CreateSubjectTypeAsync();
        var subject = await factory.CreateSubjectAsync(subjectType);
        var now = DateTime.UtcNow;
        await factory.CreateFollowAsync(me.Id, FollowTargetType.User, followedUserId: author.Id);
        var review = await factory.CreateReviewAsync(author.Id, subject.Id, now, "Followed user review");

        // Act
        var response = await client.GetAsync("/api/feed");
        var (json, raw) = await response.ReadJsonWithRawAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(json.GetProperty("success").GetBoolean(), raw);
        var data = json.GetProperty("data");
        Assert.Equal(1, data.GetProperty("totalCount").GetInt32());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Single(items);
        var item = items[0];
        Assert.Equal(review.Id, item.GetProperty("reviewId").GetInt64());
        Assert.Equal(author.Id, item.GetProperty("authorId").GetString());
    }

    [Fact]
    public async Task GetFeed_FilteredBySubjectAndType_ReturnsOnlyFollowedContent()
    {
        // Arrange
        using var client = factory.CreateClientWithCookies();
        var me = await client.SignInAsUserAsync(factory);
        var followedType = await factory.CreateSubjectTypeAsync();
        var otherType = await factory.CreateSubjectTypeAsync();
        var followedSubject = await factory.CreateSubjectAsync(followedType);
        var typeSubject = await factory.CreateSubjectAsync(followedType);
        var otherSubject = await factory.CreateSubjectAsync(otherType);
        var author = await factory.CreateUserAsync();
        var now = DateTime.UtcNow;

        await factory.CreateFollowAsync(me.Id, FollowTargetType.Subject, subjectId: followedSubject.Id);
        await factory.CreateFollowAsync(me.Id, FollowTargetType.SubjectType, subjectTypeId: followedType.Id);

        var includedReview = await factory.CreateReviewAsync(author.Id, followedSubject.Id, now.AddMinutes(-1), "Subject follow");
        var typeReview = await factory.CreateReviewAsync(author.Id, typeSubject.Id, now.AddMinutes(-2), "Subject type follow");
        var excludedReview = await factory.CreateReviewAsync(author.Id, otherSubject.Id, now, "Should not appear");

        // Act
        var response = await client.GetAsync("/api/feed?pageSize=5");
        var (json, raw) = await response.ReadJsonWithRawAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(json.GetProperty("success").GetBoolean(), raw);
        var items = json.GetProperty("data").GetProperty("items").EnumerateArray().ToList();
        var reviewIds = items.Select(i => i.GetProperty("reviewId").GetInt64()).ToList();
        Assert.Equal(2, items.Count);
        Assert.Contains(includedReview.Id, reviewIds);
        Assert.Contains(typeReview.Id, reviewIds);
        Assert.DoesNotContain(excludedReview.Id, reviewIds);
    }

    [Fact]
    public async Task GetFeed_WithNoFollows_ReturnsEmptyResult()
    {
        // Arrange
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        // Act
        var response = await client.GetAsync("/api/feed");
        var (json, raw) = await response.ReadJsonWithRawAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(json.GetProperty("success").GetBoolean(), raw);
        var data = json.GetProperty("data");
        Assert.Equal(0, data.GetProperty("totalCount").GetInt32());
        Assert.Empty(data.GetProperty("items").EnumerateArray());
        Assert.False(data.GetProperty("hasMore").GetBoolean());
        Assert.Equal(JsonValueKind.Null, data.GetProperty("nextCursor").ValueKind);
    }

    [Fact]
    public async Task GetFeed_WithInvalidPage_ReturnsBadRequest()
    {
        // Arrange
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        // Act
        var response = await client.GetAsync("/api/feed?page=0");
        var (json, _) = await response.ReadJsonWithRawAsync();

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("FEED_INVALID_QUERY", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task GetFeed_WithInvalidCursor_ReturnsBadRequest()
    {
        // Arrange
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        // Act
        var response = await client.GetAsync("/api/feed?afterId=0");
        var (json, _) = await response.ReadJsonWithRawAsync();

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("FEED_INVALID_QUERY", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task GetFeed_WithoutAuthentication_ReturnsUnauthorized()
    {
        // Arrange
        using var client = factory.CreateClient();

        // Act
        var response = await client.GetAsync("/api/feed");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
