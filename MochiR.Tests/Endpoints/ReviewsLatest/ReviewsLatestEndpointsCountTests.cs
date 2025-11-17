using System.Text.Json;
using MochiR.Api.Entities;
using MochiR.Tests.Helpers;

namespace MochiR.Tests.Endpoints.ReviewsLatest;

public sealed class ReviewsLatestEndpointsCountTests : IClassFixture<IsolatedDbWebApplicationFactory>, IAsyncLifetime
{
    private readonly IsolatedDbWebApplicationFactory factory;

    public ReviewsLatestEndpointsCountTests(IsolatedDbWebApplicationFactory factory)
    {
        this.factory = factory;
    }

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetLatestReviews_ReturnsAccurateTotals()
    {
        // Arrange
        using var client = factory.CreateClient();
        var baseline = await client.GetTotalCountAsync("/api/reviews/latest");
        var subjectType = await factory.CreateSubjectTypeAsync();
        var subject = await factory.CreateSubjectAsync(subjectType);
        var author = await factory.CreateUserAsync();
        var secondAuthor = await factory.CreateUserAsync();
        var now = DateTime.UtcNow;
        var newest = await factory.CreateReviewAsync(author.Id, subject.Id, now, "Latest count newest");
        var older = await factory.CreateReviewAsync(secondAuthor.Id, subject.Id, now.AddMinutes(-5), "Latest count older");
        await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-10), "Latest count pending", ReviewStatus.Pending);
        await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-15), "Latest count deleted", ReviewStatus.Approved, isDeleted: true);

        // Act
        var response = await client.GetAsync("/api/reviews/latest");
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
        Assert.Equal(newest.Id, items[0].GetProperty("id").GetInt64());
        Assert.Equal(older.Id, items[1].GetProperty("id").GetInt64());
    }

    [Fact]
    public async Task GetLatestReviews_WithLimitedPage_ReturnsCursorAlignedTotals()
    {
        // Arrange
        using var client = factory.CreateClient();
        var baseline = await client.GetTotalCountAsync("/api/reviews/latest");
        var subjectType = await factory.CreateSubjectTypeAsync();
        var subject = await factory.CreateSubjectAsync(subjectType);
        var author = await factory.CreateUserAsync();
        var now = DateTime.UtcNow;
        var newest = await factory.CreateReviewAsync(author.Id, subject.Id, now, "Latest count cursor newest");
        await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-1), "Latest count cursor middle");
        await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-2), "Latest count cursor oldest");

        // Act
        var response = await client.GetAsync("/api/reviews/latest?pageSize=1");
        var (json, raw) = await response.ReadJsonWithRawAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(json.GetProperty("success").GetBoolean(), raw);
        var data = json.GetProperty("data");
        Assert.Equal(baseline + 3, data.GetProperty("totalCount").GetInt32());
        Assert.True(data.GetProperty("hasMore").GetBoolean());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Single(items);
        Assert.Equal(newest.Id, items[0].GetProperty("id").GetInt64());
        var cursor = data.GetProperty("nextCursor");
        Assert.Equal(newest.Id, cursor.GetProperty("reviewId").GetInt64());
        Assert.Equal(newest.CreatedAt, cursor.GetProperty("createdAtUtc").GetDateTime());
    }
}
