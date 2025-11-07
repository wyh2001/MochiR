using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Tests.Endpoints;

public sealed class ReviewsEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory factory;

    public ReviewsEndpointsTests(CustomWebApplicationFactory factory)
    {
        this.factory = factory;
    }

    [Fact]
    public async Task GetReviews_ReturnsExistingReviews()
    {
        var subject = await CreateSubjectAsync();
        var user = await CreateUserAsync();
        await CreateReviewAsync(subject.Id, user.Id, "First Review");
        await CreateReviewAsync(subject.Id, user.Id, "Second Review", isDeleted: true);

        using var client = factory.CreateClientWithCookies();
        var response = await client.GetAsync("/api/reviews");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var items = json.GetProperty("data").EnumerateArray().ToList();
        Assert.Contains(items, item => item.GetProperty("title").GetString() == "First Review");
        Assert.DoesNotContain(items, item => item.GetProperty("title").GetString() == "Second Review");
        var first = items.First(item => item.GetProperty("title").GetString() == "First Review");
        Assert.Equal(subject.Name, first.GetProperty("subjectName").GetString());
        Assert.Equal(user.UserName, first.GetProperty("authorUserName").GetString());
        Assert.Equal("Test User", first.GetProperty("authorDisplayName").GetString());
        Assert.Equal("https://example.com/avatar.png", first.GetProperty("authorAvatarUrl").GetString());
    }

    [Fact]
    public async Task GetReviews_FilteredBySubject_ReturnsOnlySubjectReviews()
    {
        var subject1 = await CreateSubjectAsync();
        var subject2 = await CreateSubjectAsync();
        var user = await CreateUserAsync();
        await CreateReviewAsync(subject1.Id, user.Id, "Subject1 Review");
        await CreateReviewAsync(subject2.Id, user.Id, "Subject2 Review");

        using var client = factory.CreateClientWithCookies();
        var response = await client.GetAsync($"/api/reviews?subjectId={subject1.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = json.GetProperty("data").EnumerateArray().ToList();
        Assert.All(items, item => Assert.Equal(subject1.Id, item.GetProperty("subjectId").GetInt32()));
        Assert.Contains(items, item => item.GetProperty("title").GetString() == "Subject1 Review");
        Assert.DoesNotContain(items, item => item.GetProperty("title").GetString() == "Subject2 Review");
        Assert.All(items, item => Assert.Equal(subject1.Name, item.GetProperty("subjectName").GetString()));
        Assert.All(items, item => Assert.Equal(user.UserName, item.GetProperty("authorUserName").GetString()));
        Assert.All(items, item => Assert.Equal("Test User", item.GetProperty("authorDisplayName").GetString()));
        Assert.All(items, item => Assert.Equal("https://example.com/avatar.png", item.GetProperty("authorAvatarUrl").GetString()));
    }

    [Fact]
    public async Task GetReviewById_ReturnsDetail()
    {
        var subject = await CreateSubjectAsync();
        var user = await CreateUserAsync();
        var review = await CreateReviewAsync(subject.Id, user.Id, "Detail Review", includeMedia: true);

        using var client = factory.CreateClientWithCookies();
        var response = await client.GetAsync($"/api/reviews/{review.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data");
        Assert.Equal(review.Id, data.GetProperty("id").GetInt64());
        Assert.Equal(subject.Id, data.GetProperty("subjectId").GetInt32());
        Assert.Equal("Detail Review", data.GetProperty("title").GetString());
        Assert.Equal(subject.Name, data.GetProperty("subjectName").GetString());
        Assert.Equal(user.UserName, data.GetProperty("authorUserName").GetString());
        Assert.Equal("Test User", data.GetProperty("authorDisplayName").GetString());
        Assert.Equal("https://example.com/avatar.png", data.GetProperty("authorAvatarUrl").GetString());
        var media = data.GetProperty("media").EnumerateArray().ToList();
        Assert.Single(media);
        var ratings = data.GetProperty("ratings").EnumerateArray().ToList();
        Assert.Single(ratings);
    }

    [Fact]
    public async Task PostReview_WithoutAuthentication_ReturnsUnauthorized()
    {
        var subject = await CreateSubjectAsync();
        using var client = factory.CreateClientWithCookies();
        var payload = new { SubjectId = subject.Id, Title = "New Review", Content = "Content" };

        var response = await client.PostAsJsonAsync("/api/reviews", payload);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostReview_WithValidPayload_CreatesReview()
    {
        var subject = await CreateSubjectAsync();
        using var client = factory.CreateClientWithCookies();
        var password = "Valid123!";
        var user = await client.SignInAsUserAsync(factory, password);

        var payload = new
        {
            SubjectId = subject.Id,
            Title = "Created Review",
            Content = "Review content",
            Ratings = new[]
            {
                new { Key = "quality", Score = 4.5m, Label = "Great" },
                new { Key = "service", Score = 4.0m, Label = "Good" }
            }
        };

        var response = await client.PostAsJsonAsync("/api/reviews", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        var reviewId = data.GetProperty("id").GetInt64();
        Assert.Equal(subject.Id, data.GetProperty("subjectId").GetInt32());
        Assert.Equal(user.Id, data.GetProperty("userId").GetString());
        Assert.Equal(subject.Name, data.GetProperty("subjectName").GetString());
        Assert.Equal(user.UserName, data.GetProperty("authorUserName").GetString());
        Assert.Equal("Test User", data.GetProperty("authorDisplayName").GetString());
        Assert.Equal("https://example.com/avatar.png", data.GetProperty("authorAvatarUrl").GetString());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var review = await db.Reviews.Include(r => r.Ratings).FirstOrDefaultAsync(r => r.Id == reviewId);
        Assert.NotNull(review);
        Assert.Equal(2, review!.Ratings.Count);
        Assert.Contains(review.Ratings, r => r.Key == "service" && r.Score == 4.0m);
    }

    [Fact]
    public async Task PostReview_WithTooLongTitle_ReturnsBadRequest()
    {
        var subject = await CreateSubjectAsync();
        using var client = factory.CreateClientWithCookies();
        var password = "Valid123!";
        await client.SignInAsUserAsync(factory, password);

        var payload = new
        {
            SubjectId = subject.Id,
            Title = new string('a', 257),
            Content = "Valid content"
        };

        var response = await client.PostAsJsonAsync("/api/reviews", payload);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("REVIEW_INVALID_INPUT", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PostReview_WithTooLongContent_ReturnsBadRequest()
    {
        var subject = await CreateSubjectAsync();
        using var client = factory.CreateClientWithCookies();
        var password = "Valid123!";
        await client.SignInAsUserAsync(factory, password);

        var payload = new
        {
            SubjectId = subject.Id,
            Title = "Valid Title",
            Content = new string('a', 20001)
        };

        var response = await client.PostAsJsonAsync("/api/reviews", payload);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("REVIEW_INVALID_INPUT", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PostReview_DuplicateReview_ReturnsConflict()
    {
        var subject = await CreateSubjectAsync();
        using var client = factory.CreateClientWithCookies();
        var password = "Valid123!";
        var user = await client.SignInAsUserAsync(factory, password);
        await CreateReviewAsync(subject.Id, user.Id, "Existing Review");

        var payload = new { SubjectId = subject.Id, Title = "Existing Review", Content = "Duplicate" };

        var response = await client.PostAsJsonAsync("/api/reviews", payload);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("REVIEW_DUPLICATE", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PutReview_NotOwner_ReturnsForbidden()
    {
        var subject = await CreateSubjectAsync();
        var owner = await CreateUserAsync();
        var review = await CreateReviewAsync(subject.Id, owner.Id, "Owner Review");

        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var payload = new
        {
            Title = "Updated Title",
            Content = "Updated Content",
            Ratings = new[] { new { Key = "quality", Score = 4.0m, Label = "Good" } }
        };

        var response = await client.PutAsJsonAsync($"/api/reviews/{review.Id}", payload);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PutReview_InvalidPayload_ReturnsBadRequest()
    {
        var subject = await CreateSubjectAsync();
        var password = "Valid123!";
        using var client = factory.CreateClientWithCookies();
        var user = await client.SignInAsUserAsync(factory, password);
        var review = await CreateReviewAsync(subject.Id, user.Id, "Review Title");

        var payload = new { Title = " ", Content = "Updated", Ratings = Array.Empty<object>() };

        var response = await client.PutAsJsonAsync($"/api/reviews/{review.Id}", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("REVIEW_INVALID_INPUT", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PutReview_WithTooLongTitle_ReturnsBadRequest()
    {
        var subject = await CreateSubjectAsync();
        var password = "Valid123!";
        using var client = factory.CreateClientWithCookies();
        var user = await client.SignInAsUserAsync(factory, password);
        var review = await CreateReviewAsync(subject.Id, user.Id, "Original Title");

        var payload = new
        {
            Title = new string('a', 257),
            Content = "Updated Content",
            Ratings = Array.Empty<object>()
        };

        var response = await client.PutAsJsonAsync($"/api/reviews/{review.Id}", payload);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("REVIEW_INVALID_INPUT", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PutReview_WithTooLongContent_ReturnsBadRequest()
    {
        var subject = await CreateSubjectAsync();
        var password = "Valid123!";
        using var client = factory.CreateClientWithCookies();
        var user = await client.SignInAsUserAsync(factory, password);
        var review = await CreateReviewAsync(subject.Id, user.Id, "Original Title");

        var payload = new
        {
            Title = "Updated Title",
            Content = new string('a', 20001),
            Ratings = Array.Empty<object>()
        };

        var response = await client.PutAsJsonAsync($"/api/reviews/{review.Id}", payload);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("REVIEW_INVALID_INPUT", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PutReview_SucceedsForOwner()
    {
        var subject = await CreateSubjectAsync();
        var password = "Valid123!";
        using var client = factory.CreateClientWithCookies();
        var user = await client.SignInAsUserAsync(factory, password);
        var review = await CreateReviewAsync(subject.Id, user.Id, "Original Title");

        var payload = new
        {
            Title = "Updated Title",
            Content = "Updated Content",
            Ratings = new[]
            {
                new { Key = "quality", Score = 4.7m, Label = "Excellent" }
            }
        };

        var response = await client.PutAsJsonAsync($"/api/reviews/{review.Id}", payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal("Updated Title", data.GetProperty("title").GetString());
        Assert.Equal("Updated Content", data.GetProperty("content").GetString());
        Assert.Equal(subject.Name, data.GetProperty("subjectName").GetString());
        Assert.Equal(user.UserName, data.GetProperty("authorUserName").GetString());
        Assert.Equal("Test User", data.GetProperty("authorDisplayName").GetString());
        Assert.Equal("https://example.com/avatar.png", data.GetProperty("authorAvatarUrl").GetString());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var updated = await db.Reviews.Include(r => r.Ratings).FirstOrDefaultAsync(r => r.Id == review.Id);
        Assert.NotNull(updated);
        Assert.Single(updated!.Ratings);
        Assert.Equal(ReviewStatus.Pending, updated.Status);
    }

    [Fact]
    public async Task DeleteReview_NotOwner_ReturnsForbidden()
    {
        var subject = await CreateSubjectAsync();
        var owner = await CreateUserAsync();
        var review = await CreateReviewAsync(subject.Id, owner.Id, "Owner Review");

        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var response = await client.DeleteAsync($"/api/reviews/{review.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteReview_SucceedsForOwner()
    {
        var subject = await CreateSubjectAsync();
        var password = "Valid123!";
        using var client = factory.CreateClientWithCookies();
        var user = await client.SignInAsUserAsync(factory, password);
        var review = await CreateReviewAsync(subject.Id, user.Id, "Owner Review");

        var response = await client.DeleteAsync($"/api/reviews/{review.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(review.Id, data.GetProperty("id").GetInt64());
        Assert.True(data.GetProperty("deleted").GetBoolean());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var deleted = await db.Reviews.FirstOrDefaultAsync(r => r.Id == review.Id);
        Assert.NotNull(deleted);
        Assert.True(deleted!.IsDeleted);
        Assert.Equal(ReviewStatus.Pending, deleted.Status);
    }

    [Fact]
    public async Task GetReviewById_WhenDeleted_ReturnsNotFound()
    {
        var subject = await CreateSubjectAsync();
        var password = "Valid123!";
        using var client = factory.CreateClientWithCookies();
        var user = await client.SignInAsUserAsync(factory, password);
        var review = await CreateReviewAsync(subject.Id, user.Id, "Owner Review");

        var deleteResponse = await client.DeleteAsync($"/api/reviews/{review.Id}");
        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

        var getResponse = await client.GetAsync($"/api/reviews/{review.Id}");

        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
        var json = await getResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("REVIEW_NOT_FOUND", json.GetProperty("error").GetProperty("code").GetString());
    }

    private async Task<Subject> CreateSubjectAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var subjectType = new SubjectType
        {
            Key = $"type-{Guid.NewGuid():N}",
            DisplayName = "Type"
        };

        db.SubjectTypes.Add(subjectType);
        await db.SaveChangesAsync();

        var subject = new Subject
        {
            Name = $"Subject {Guid.NewGuid():N}",
            Slug = $"subject-{Guid.NewGuid():N}",
            SubjectTypeId = subjectType.Id
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
            Email = $"{Guid.NewGuid():N}@example.com",
            EmailConfirmed = true,
            LockoutEnabled = false,
            DisplayName = "Test User",
            AvatarUrl = "https://example.com/avatar.png"
        };

        var result = await userManager.CreateAsync(user, "Valid123!");
        Assert.True(result.Succeeded, string.Join(",", result.Errors.Select(e => e.Description)));
        return user;
    }

    private async Task<Review> CreateReviewAsync(int subjectId, string userId, string title, bool isDeleted = false, bool includeMedia = false)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var review = new Review
        {
            SubjectId = subjectId,
            UserId = userId,
            Title = title,
            Content = "Content",
            Status = ReviewStatus.Approved,
            Ratings = new List<ReviewRating>
            {
                new() { Key = "quality", Score = 4.5m, Label = "Great" }
            },
            Media = includeMedia
                ? new List<ReviewMedia>
                {
                    new()
                    {
                        Url = "http://example.com/image.jpg",
                        Type = MediaType.Image,
                        Metadata = new List<ReviewMediaMetadata>
                        {
                            new() { Key = "resolution", Value = "1920x1080", Note = "HD" }
                        }
                    }
                }
                : new List<ReviewMedia>(),
            IsDeleted = isDeleted,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Reviews.Add(review);
        await db.SaveChangesAsync();
        return review;
    }
}
