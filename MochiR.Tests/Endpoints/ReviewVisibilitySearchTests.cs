using System.Text.Json;
using MochiR.Api.Entities;
using MochiR.Tests.Helpers;

namespace MochiR.Tests.Endpoints;

public sealed class ReviewVisibilitySearchTests
{
    [PostgresFact]
    public async Task PublicSearch_ExcludesUnpublishedAndDeletedReviews()
    {
        var (factory, error) = await PostgresWebApplicationFactory.TryCreateAsync();
        Assert.True(factory is not null, error);
        using (factory)
        {
            var subjectType = await factory.CreateSubjectTypeAsync();
            var subject = await factory.CreateSubjectAsync(subjectType, "Coffee visibility", "coffee-visibility");
            var author = await factory.CreateUserAsync();
            var approved = await factory.CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow, "Approved coffee review");
            foreach (var status in new[] { ReviewStatus.Pending, ReviewStatus.Rejected, ReviewStatus.Flagged, ReviewStatus.Approved })
            {
                var hiddenAuthor = await factory.CreateUserAsync();
                await factory.CreateReviewAsync(hiddenAuthor.Id, subject.Id, DateTime.UtcNow, "Hidden coffee review",
                    status, isDeleted: status == ReviewStatus.Approved);
            }

            using var client = factory.CreateClient();
            var response = await client.GetAsync("/api/search?query=coffee");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var json = await response.Content.ReadFromJsonAsync<JsonElement>();
            var results = json.GetProperty("data").GetProperty("results").EnumerateArray().ToList();
            Assert.Contains(results, item => item.GetProperty("subjectId").ValueKind != JsonValueKind.Null &&
                item.GetProperty("subjectId").GetInt32() == subject.Id);
            var review = Assert.Single(results, item => item.GetProperty("type").GetString() == "Review");
            Assert.Equal(approved.Id, review.GetProperty("reviewId").GetInt64());
        }
    }
}
