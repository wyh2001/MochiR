using MochiR.Api.Entities;
using MochiR.Tests.Helpers;

namespace MochiR.Tests.Endpoints.ReviewsLatest;

public sealed class ReviewsLatestEndpointsBasicTests : IClassFixture<IsolatedDbWebApplicationFactory>, IAsyncLifetime
{
    private readonly IsolatedDbWebApplicationFactory factory;

    public ReviewsLatestEndpointsBasicTests(IsolatedDbWebApplicationFactory factory)
    {
        this.factory = factory;
    }

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetLatestReviews_WithApprovedData_ReturnsDescendingOrder()
    {
        // Arrange
        using var client = factory.CreateClient();
        var subjectType = await factory.CreateSubjectTypeAsync();
        var subject = await factory.CreateSubjectAsync(subjectType);
        var author = await factory.CreateUserAsync();
        var now = DateTime.UtcNow;
        var newest = await factory.CreateReviewAsync(author.Id, subject.Id, now, "Latest newest");
        var older = await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-5), "Latest older");
        await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-10), "Latest pending", ReviewStatus.Pending);
        await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-15), "Latest deleted", ReviewStatus.Approved, isDeleted: true);

        // Act
        var response = await client.GetAsync("/api/reviews/latest");
        var (json, raw) = await response.ReadJsonWithRawAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(json.GetProperty("success").GetBoolean(), raw);
        var data = json.GetProperty("data");
        Assert.Equal(2, data.GetProperty("totalCount").GetInt32());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(2, items.Count);
        Assert.Equal(newest.Id, items[0].GetProperty("id").GetInt64());
        Assert.Equal(older.Id, items[1].GetProperty("id").GetInt64());
    }

    [Fact]
    public async Task GetLatestReviews_WithLimitedPage_ReturnsHasMore()
    {
        // Arrange
        using var client = factory.CreateClient();
        var subjectType = await factory.CreateSubjectTypeAsync();
        var subject = await factory.CreateSubjectAsync(subjectType);
        var author = await factory.CreateUserAsync();
        var now = DateTime.UtcNow;
        var first = await factory.CreateReviewAsync(author.Id, subject.Id, now, "Latest page first");
        await factory.CreateReviewAsync(author.Id, subject.Id, now.AddMinutes(-1), "Latest page second");

        // Act
        var response = await client.GetAsync("/api/reviews/latest?pageSize=1");
        var (json, raw) = await response.ReadJsonWithRawAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(json.GetProperty("success").GetBoolean(), raw);
        var data = json.GetProperty("data");
        Assert.Equal(2, data.GetProperty("totalCount").GetInt32());
        Assert.True(data.GetProperty("hasMore").GetBoolean());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Single(items);
        Assert.Equal(first.Id, items[0].GetProperty("id").GetInt64());
    }

    [Fact]
    public async Task GetLatestReviews_WithInvalidPage_ReturnsBadRequest()
    {
        // Arrange
        using var client = factory.CreateClient();

        // Act
        var response = await client.GetAsync("/api/reviews/latest?page=0");
        var (json, _) = await response.ReadJsonWithRawAsync();

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("REVIEW_INVALID_QUERY", json.GetProperty("error").GetProperty("code").GetString());
    }
}
