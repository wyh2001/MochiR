using System.Text.Json;
using MochiR.Tests.Helpers;

namespace MochiR.Tests.Endpoints.ReviewsLatest;

public sealed class ReviewsLatestEndpointsCursorTests : IClassFixture<IsolatedDbWebApplicationFactory>, IAsyncLifetime
{
    private readonly IsolatedDbWebApplicationFactory factory;

    public ReviewsLatestEndpointsCursorTests(IsolatedDbWebApplicationFactory factory)
    {
        this.factory = factory;
    }

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetLatestReviews_FirstPage_ReturnsOrderedItemsWithCursor()
    {
        // Arrange
        using var client = factory.CreateClient();
        var subjectType = await factory.CreateSubjectTypeAsync();
        var subject = await factory.CreateSubjectAsync(subjectType);
        var author = await factory.CreateUserAsync();
        var now = DateTime.UtcNow;
        var newest = await factory.CreateReviewAsync(author.Id, subject.Id, now, "Latest cursor newest");
        var middle = await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-1), "Latest cursor middle");
        await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-2), "Latest cursor oldest");

        // Act
        var response = await client.GetAsync("/api/reviews/latest?pageSize=2");
        var (json, raw) = await response.ReadJsonWithRawAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(json.GetProperty("success").GetBoolean(), raw);
        var data = json.GetProperty("data");
        Assert.Equal(3, data.GetProperty("totalCount").GetInt32());
        Assert.True(data.GetProperty("hasMore").GetBoolean());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(2, items.Count);
        Assert.Equal(newest.Id, items[0].GetProperty("id").GetInt64());
        Assert.Equal(middle.Id, items[1].GetProperty("id").GetInt64());
        var cursor = data.GetProperty("nextCursor");
        Assert.Equal(middle.Id, cursor.GetProperty("reviewId").GetInt64());
        Assert.Equal(middle.CreatedAt, cursor.GetProperty("createdAtUtc").GetDateTime());
    }

    [Fact]
    public async Task GetLatestReviews_WithCursor_ReturnsOlderEntriesAndFinalCursor()
    {
        // Arrange
        using var client = factory.CreateClient();
        var subjectType = await factory.CreateSubjectTypeAsync();
        var subject = await factory.CreateSubjectAsync(subjectType);
        var author = await factory.CreateUserAsync();
        var baseline = await client.GetTotalCountAsync("/api/reviews/latest");
        var now = DateTime.UtcNow;
        await factory.CreateReviewAsync(author.Id, subject.Id, now, "Latest cursor first page");
        var middle = await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-1), "Latest cursor middle page");
        var oldest = await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-2), "Latest cursor oldest page");

        var firstResponse = await client.GetAsync("/api/reviews/latest?pageSize=2");
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        var (firstJson, firstRaw) = await firstResponse.ReadJsonWithRawAsync();
        Assert.True(firstJson.GetProperty("success").GetBoolean(), firstRaw);
        var firstData = firstJson.GetProperty("data");
        Assert.Equal(baseline + 3, firstData.GetProperty("totalCount").GetInt32());
        var firstCursor = firstData.GetProperty("nextCursor");
        var cursorQuery = TestResponseHelper.BuildCursorQuery("/api/reviews/latest", 2, firstCursor);

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
        Assert.Equal(oldest.Id, items[0].GetProperty("id").GetInt64());
        Assert.Equal(middle.Id, firstCursor.GetProperty("reviewId").GetInt64());
        Assert.Equal(middle.CreatedAt, firstCursor.GetProperty("createdAtUtc").GetDateTime());
    }
}
