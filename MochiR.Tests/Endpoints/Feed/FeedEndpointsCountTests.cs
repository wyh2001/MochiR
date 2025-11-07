using System.Text.Json;
using MochiR.Api.Entities;
using MochiR.Tests.Helpers;

namespace MochiR.Tests.Endpoints.Feed;

public sealed class FeedEndpointsCountTests : IClassFixture<IsolatedDbWebApplicationFactory>, IAsyncLifetime
{
    private readonly IsolatedDbWebApplicationFactory factory;

    public FeedEndpointsCountTests(IsolatedDbWebApplicationFactory factory)
    {
        this.factory = factory;
    }

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetFeed_ReturnsAccurateTotalCountForFollowedReviews()
    {
        // Arrange
        using var client = factory.CreateClientWithCookies();
        var me = await client.SignInAsUserAsync(factory);
        var author = await factory.CreateUserAsync();
        var subjectType = await factory.CreateSubjectTypeAsync();
        var subject = await factory.CreateSubjectAsync(subjectType);
        await factory.CreateFollowAsync(me.Id, FollowTargetType.User, followedUserId: author.Id);
        var baseline = await client.GetTotalCountAsync("/api/feed");
        var now = DateTime.UtcNow;
        var first = await factory.CreateReviewAsync(author.Id, subject.Id, now, "Count newest");
        var second = await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-1), "Count older");
        await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-2), "Excluded pending", ReviewStatus.Pending);
        await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-3), "Excluded deleted", ReviewStatus.Approved, isDeleted: true);

        // Act
        var response = await client.GetAsync("/api/feed?pageSize=10");
        var (json, raw) = await response.ReadJsonWithRawAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(json.GetProperty("success").GetBoolean(), raw);
        var data = json.GetProperty("data");
        Assert.Equal(baseline + 2, data.GetProperty("totalCount").GetInt32());
        Assert.False(data.GetProperty("hasMore").GetBoolean());
        Assert.Equal(JsonValueKind.Null, data.GetProperty("nextCursor").ValueKind);
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(2, items.Count);
        Assert.Equal(first.Id, items[0].GetProperty("reviewId").GetInt64());
        Assert.Equal(second.Id, items[1].GetProperty("reviewId").GetInt64());
    }

    [Fact]
    public async Task GetFeed_WithLimitedPage_ReturnsAccurateTotalsAndCursor()
    {
        // Arrange
        using var client = factory.CreateClientWithCookies();
        var me = await client.SignInAsUserAsync(factory);
        var author = await factory.CreateUserAsync();
        var subjectType = await factory.CreateSubjectTypeAsync();
        var subject = await factory.CreateSubjectAsync(subjectType);
        await factory.CreateFollowAsync(me.Id, FollowTargetType.User, followedUserId: author.Id);
        var baseline = await client.GetTotalCountAsync("/api/feed");
        var now = DateTime.UtcNow;
        var newest = await factory.CreateReviewAsync(author.Id, subject.Id, now, "Count cursor newest");
        await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-1), "Count cursor middle");
        await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-2), "Count cursor oldest");

        // Act
        var response = await client.GetAsync("/api/feed?pageSize=1");
        var (json, raw) = await response.ReadJsonWithRawAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(json.GetProperty("success").GetBoolean(), raw);
        var data = json.GetProperty("data");
        Assert.Equal(baseline + 3, data.GetProperty("totalCount").GetInt32());
        Assert.True(data.GetProperty("hasMore").GetBoolean());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Single(items);
        Assert.Equal(newest.Id, items[0].GetProperty("reviewId").GetInt64());
        var cursor = data.GetProperty("nextCursor");
        Assert.Equal(newest.Id, cursor.GetProperty("reviewId").GetInt64());
        Assert.Equal(newest.CreatedAt, cursor.GetProperty("createdAtUtc").GetDateTime());
    }
}
