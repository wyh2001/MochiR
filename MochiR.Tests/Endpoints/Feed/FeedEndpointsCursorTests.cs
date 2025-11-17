using System.Text.Json;
using MochiR.Api.Entities;
using MochiR.Tests.Helpers;

namespace MochiR.Tests.Endpoints.Feed;

public sealed class FeedEndpointsCursorTests : IClassFixture<IsolatedDbWebApplicationFactory>, IAsyncLifetime
{
    private readonly IsolatedDbWebApplicationFactory factory;

    public FeedEndpointsCursorTests(IsolatedDbWebApplicationFactory factory)
    {
        this.factory = factory;
    }

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetFeed_FirstPage_ReturnsOrderedItemsWithCursor()
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
        var newest = await factory.CreateReviewAsync(author.Id, subject.Id, now, "Cursor newest");
        var middle = await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-1), "Cursor middle");
        await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-2), "Cursor oldest");

        // Act
        var response = await client.GetAsync("/api/feed?pageSize=2");
        var (json, raw) = await response.ReadJsonWithRawAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(json.GetProperty("success").GetBoolean(), raw);
        var data = json.GetProperty("data");
        Assert.Equal(baseline + 3, data.GetProperty("totalCount").GetInt32());
        Assert.True(data.GetProperty("hasMore").GetBoolean());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(2, items.Count);
        Assert.Equal(newest.Id, items[0].GetProperty("reviewId").GetInt64());
        Assert.Equal(middle.Id, items[1].GetProperty("reviewId").GetInt64());

        var nextCursor = data.GetProperty("nextCursor");
        Assert.Equal(middle.Id, nextCursor.GetProperty("reviewId").GetInt64());
        Assert.Equal(middle.CreatedAt, nextCursor.GetProperty("createdAtUtc").GetDateTime());
    }

    [Fact]
    public async Task GetFeed_WithCursor_ReturnsOlderEntriesWithFinalCursor()
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
        await factory.CreateReviewAsync(author.Id, subject.Id, now, "Cursor first page");
        var middle = await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-1), "Cursor middle page");
        var oldest = await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-2), "Cursor oldest page");

        var firstResponse = await client.GetAsync("/api/feed?pageSize=2");
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        var (firstJson, firstRaw) = await firstResponse.ReadJsonWithRawAsync();
        Assert.True(firstJson.GetProperty("success").GetBoolean(), firstRaw);
        var firstData = firstJson.GetProperty("data");
        Assert.Equal(baseline + 3, firstData.GetProperty("totalCount").GetInt32());
        var firstCursor = firstData.GetProperty("nextCursor");
        var cursorQuery = TestResponseHelper.BuildCursorQuery("/api/feed", 2, firstCursor);

        // Act
        var response = await client.GetAsync(cursorQuery);
        var (json, raw) = await response.ReadJsonWithRawAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(json.GetProperty("success").GetBoolean(), raw);
        var data = json.GetProperty("data");
        Assert.Equal(baseline + 3, data.GetProperty("totalCount").GetInt32());
        Assert.False(data.GetProperty("hasMore").GetBoolean());
        Assert.Equal(JsonValueKind.Null, data.GetProperty("nextCursor").ValueKind);
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Single(items);
        Assert.Equal(oldest.Id, items[0].GetProperty("reviewId").GetInt64());
        Assert.Equal(middle.Id, firstCursor.GetProperty("reviewId").GetInt64());
        Assert.Equal(middle.CreatedAt, firstCursor.GetProperty("createdAtUtc").GetDateTime());
    }
}
