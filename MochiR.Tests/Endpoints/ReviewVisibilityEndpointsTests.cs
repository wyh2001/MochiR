using System.Text.Json;
using MochiR.Api.Entities;
using MochiR.Tests.Helpers;

namespace MochiR.Tests.Endpoints;

public sealed class ReviewVisibilityEndpointsTests
{
    [Theory]
    [InlineData(ReviewStatus.Pending)]
    [InlineData(ReviewStatus.Rejected)]
    [InlineData(ReviewStatus.Flagged)]
    public async Task UnpublishedReviews_AreVisibleOnlyToAuthorAndAdmin(ReviewStatus status)
    {
        using var factory = new IsolatedDbWebApplicationFactory();
        using var author = factory.CreateClientWithCookies();
        using var admin = factory.CreateClientWithCookies();
        using var reader = factory.CreateClientWithCookies();
        using var anonymous = factory.CreateClient();
        var user = await author.SignInAsUserAsync(factory);
        await admin.SignInAsAdminAsync(factory);
        await reader.SignInAsUserAsync(factory);
        var subjectType = await factory.CreateSubjectTypeAsync();
        var subject = await factory.CreateSubjectAsync(subjectType);
        var review = await factory.CreateReviewAsync(user.Id, subject.Id, DateTime.UtcNow, "Private review", status);

        foreach (var client in new[] { anonymous, reader })
        {
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/reviews/{review.Id}")).StatusCode);
            foreach (var path in new[] { "/api/reviews", $"/api/reviews?userId={user.Id}", $"/api/reviews?subjectId={subject.Id}" })
            {
                var list = await ReadDataAsync(client, path);
                Assert.Empty(list.EnumerateArray());
            }
        }

        foreach (var client in new[] { author, admin })
        {
            var detail = await ReadDataAsync(client, $"/api/reviews/{review.Id}");
            Assert.Equal(review.Id, detail.GetProperty("id").GetInt64());
            var list = await ReadDataAsync(client, "/api/reviews");
            Assert.Equal(review.Id, Assert.Single(list.EnumerateArray()).GetProperty("id").GetInt64());
            var latest = await ReadDataAsync(client, "/api/reviews/latest");
            Assert.Empty(latest.GetProperty("items").EnumerateArray());
        }

        // Like responses must not disclose the count of a hidden review.
        Assert.Equal(HttpStatusCode.NotFound, (await reader.PostAsync($"/api/reviews/{review.Id}/like", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await reader.DeleteAsync($"/api/reviews/{review.Id}/like")).StatusCode);
    }

    private static async Task<JsonElement> ReadDataAsync(HttpClient client, string path)
    {
        var response = await client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data");
    }
}
