using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Tests.Endpoints;

public sealed class ReviewsLatestEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory factory;

    public ReviewsLatestEndpointsTests(CustomWebApplicationFactory factory)
    {
        this.factory = factory;
    }

    [Fact]
    public async Task GetLatestReviews_ReturnsApprovedReviewsInDescendingOrder()
    {
        using var client = factory.CreateClient();
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType);
        var author = await CreateUserAsync();

        var newest = await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow, "Newest review");
        var older = await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow.AddMinutes(-5), "Older review");
        await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow.AddMinutes(-10), "Pending review", ReviewStatus.Pending);
        await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow.AddMinutes(-15), "Deleted review", ReviewStatus.Approved, isDeleted: true);

        var response = await client.GetAsync("/api/reviews/latest");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.True(data.GetProperty("totalCount").GetInt32() >= 2);
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.True(items.Count >= 2);
        var itemIds = items.Select(i => i.GetProperty("id").GetInt64()).ToList();
        Assert.Contains(newest.Id, itemIds);
        Assert.Contains(older.Id, itemIds);
        var newestIndex = itemIds.IndexOf(newest.Id);
        var olderIndex = itemIds.IndexOf(older.Id);
        Assert.True(newestIndex >= 0 && olderIndex >= 0 && newestIndex < olderIndex);
    }

    [Fact]
    public async Task GetLatestReviews_RespectsPageSizeAndHasMore()
    {
        using var client = factory.CreateClient();
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType);
        var author = await CreateUserAsync();

        var first = await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow, "First");
        await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow.AddMinutes(-1), "Second");

        var response = await client.GetAsync("/api/reviews/latest?pageSize=1");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var responseContent = await response.Content.ReadAsStringAsync();
        var json = JsonSerializer.Deserialize<JsonElement>(responseContent);
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.True(data.GetProperty("totalCount").GetInt32() >= 2);
        Assert.True(data.GetProperty("hasMore").GetBoolean());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.True(items.Count >= 1);
    }

    [Fact]
    public async Task GetLatestReviews_InvalidQueryReturnsBadRequest()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/reviews/latest?page=0");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("REVIEW_INVALID_QUERY", json.GetProperty("error").GetProperty("code").GetString());
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

    private async Task<Review> CreateReviewAsync(
        string authorId,
        int subjectId,
        DateTime createdAt,
        string title,
        ReviewStatus status = ReviewStatus.Approved,
        bool isDeleted = false)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var review = new Review
        {
            SubjectId = subjectId,
            UserId = authorId,
            Title = title,
            Content = $"Content for {title}",
            Status = status,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
            IsDeleted = isDeleted,
            MediaCount = 0
        };

        db.Reviews.Add(review);
        await db.SaveChangesAsync();
        return review;
    }
}

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
    public async Task GetLatestReviews_ReturnsApprovedReviewsInDescendingOrder_WithAccurateTotals()
    {
        using var client = factory.CreateClient();
        var baseline = await GetLatestTotalCountAsync(client);
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType);
        var firstAuthor = await CreateUserAsync();
        var secondAuthor = await CreateUserAsync();

        var newest = await CreateReviewAsync(firstAuthor.Id, subject.Id, DateTime.UtcNow, "Count newest review");
        var older = await CreateReviewAsync(secondAuthor.Id, subject.Id, DateTime.UtcNow.AddMinutes(-5), "Count older review");
        await CreateReviewAsync(firstAuthor.Id, subject.Id, DateTime.UtcNow.AddMinutes(-10), "Count pending review", ReviewStatus.Pending);
        await CreateReviewAsync(firstAuthor.Id, subject.Id, DateTime.UtcNow.AddMinutes(-15), "Count deleted review", ReviewStatus.Approved, isDeleted: true);

        var response = await client.GetAsync("/api/reviews/latest");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var responseContent = await response.Content.ReadAsStringAsync();
        var json = JsonSerializer.Deserialize<JsonElement>(responseContent);
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.True(data.GetProperty("totalCount").GetInt32() == baseline + 2, responseContent);
        Assert.False(data.GetProperty("hasMore").GetBoolean());

        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(2, items.Count);
        Assert.Equal(newest.Id, items[0].GetProperty("id").GetInt64());
        Assert.Equal(older.Id, items[1].GetProperty("id").GetInt64());
    }

    [Fact]
    public async Task GetLatestReviews_RespectsPageSizeAndHasMore_WithAccurateTotals()
    {
        using var client = factory.CreateClient();
        var baseline = await GetLatestTotalCountAsync(client);
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType);
        var firstAuthor = await CreateUserAsync();
        var secondAuthor = await CreateUserAsync();

        var first = await CreateReviewAsync(firstAuthor.Id, subject.Id, DateTime.UtcNow, "Count first");
        var second = await CreateReviewAsync(secondAuthor.Id, subject.Id, DateTime.UtcNow.AddMinutes(-1), "Count second");

        var response = await client.GetAsync("/api/reviews/latest?pageSize=1");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var responseContent = await response.Content.ReadAsStringAsync();
        var json = JsonSerializer.Deserialize<JsonElement>(responseContent);
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.True(data.GetProperty("totalCount").GetInt32() == baseline + 2, responseContent);
        Assert.True(data.GetProperty("hasMore").GetBoolean());

        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Single(items);
        Assert.Equal(first.Id, items[0].GetProperty("id").GetInt64());

        var nextCursor = data.GetProperty("nextCursor");
        Assert.Equal(first.Id, nextCursor.GetProperty("reviewId").GetInt64());
        Assert.Equal(first.CreatedAt, nextCursor.GetProperty("createdAtUtc").GetDateTime());
    }

    private static async Task<int> GetLatestTotalCountAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/reviews/latest");
        if (response.StatusCode != HttpStatusCode.OK)
        {
            return 0;
        }

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        if (!json.GetProperty("success").GetBoolean())
        {
            return 0;
        }

        return json.GetProperty("data").GetProperty("totalCount").GetInt32();
    }

    private async Task<SubjectType> CreateSubjectTypeAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var subjectType = new SubjectType
        {
            Key = $"count-type-{Guid.NewGuid():N}",
            DisplayName = $"Count Type {Guid.NewGuid():N}"
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
            Name = $"Count Subject {Guid.NewGuid():N}",
            Slug = $"count-subject-{Guid.NewGuid():N}",
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
            UserName = $"count-user-{Guid.NewGuid():N}",
            Email = $"count-user-{Guid.NewGuid():N}@example.com",
            EmailConfirmed = true,
            LockoutEnabled = false
        };

        var result = await userManager.CreateAsync(user);
        Assert.True(result.Succeeded, string.Join(",", result.Errors.Select(e => e.Description)));
        return user;
    }

    private async Task<Review> CreateReviewAsync(
        string authorId,
        int subjectId,
        DateTime createdAt,
        string title,
        ReviewStatus status = ReviewStatus.Approved,
        bool isDeleted = false)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var review = new Review
        {
            SubjectId = subjectId,
            UserId = authorId,
            Title = title,
            Content = $"Count content for {title}",
            Status = status,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
            IsDeleted = isDeleted,
            MediaCount = 0
        };

        db.Reviews.Add(review);
        await db.SaveChangesAsync();
        return review;
    }
}

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
    public async Task GetLatestReviews_WithPageMode_ReturnsOrderedPage()
    {
        using var client = factory.CreateClient();
        var baseline = await GetLatestTotalCountAsync(client);
        var (subject, author) = await CreateSubjectAndAuthorAsync();

        var newest = await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow, "Cursor newest");
        var middle = await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow.AddMinutes(-1), "Cursor middle");
        var oldest = await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow.AddMinutes(-2), "Cursor oldest");

        var response = await client.GetAsync("/api/reviews/latest?pageSize=2");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(baseline + 3, data.GetProperty("totalCount").GetInt32());
        Assert.True(data.GetProperty("hasMore").GetBoolean());

        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(2, items.Count);
        Assert.Equal(newest.Id, items[0].GetProperty("id").GetInt64());
        Assert.Equal(middle.Id, items[1].GetProperty("id").GetInt64());

        var nextCursor = data.GetProperty("nextCursor");
        Assert.Equal(middle.Id, nextCursor.GetProperty("reviewId").GetInt64());
        Assert.Equal(middle.CreatedAt, nextCursor.GetProperty("createdAtUtc").GetDateTime());
    }

    [Fact]
    public async Task GetLatestReviews_WithCursor_ReturnsOlderEntries()
    {
        using var client = factory.CreateClient();
        var (subject, author) = await CreateSubjectAndAuthorAsync();

        var newest = await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow, "Cursor newest page");
        var middle = await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow.AddMinutes(-1), "Cursor middle page");
        var oldest = await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow.AddMinutes(-2), "Cursor oldest page");

        var firstResponse = await client.GetAsync("/api/reviews/latest?pageSize=2");
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        var firstJson = await firstResponse.Content.ReadFromJsonAsync<JsonElement>();
        var firstData = firstJson.GetProperty("data");
        var cursor = firstData.GetProperty("nextCursor");

        var cursorTime = cursor.GetProperty("createdAtUtc").GetDateTime();
        var cursorId = cursor.GetProperty("reviewId").GetInt64();
        var cursorQuery = $"/api/reviews/latest?pageSize=2&after={Uri.EscapeDataString(cursorTime.ToString("O"))}&afterId={cursorId}";

        var secondResponse = await client.GetAsync(cursorQuery);
        Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);
        var secondJson = await secondResponse.Content.ReadFromJsonAsync<JsonElement>();
        var secondData = secondJson.GetProperty("data");
        Assert.False(secondData.GetProperty("hasMore").GetBoolean());
        Assert.Equal(JsonValueKind.Null, secondData.GetProperty("nextCursor").ValueKind);

        var items = secondData.GetProperty("items").EnumerateArray().ToList();
        Assert.Single(items);
        Assert.Equal(oldest.Id, items[0].GetProperty("id").GetInt64());
    }

    [Fact]
    public async Task GetLatestReviews_EmptyDatabase_ReturnsEmptyResult()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/reviews/latest");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(0, data.GetProperty("totalCount").GetInt32());
        Assert.Empty(data.GetProperty("items").EnumerateArray());
        Assert.False(data.GetProperty("hasMore").GetBoolean());
        Assert.Equal(JsonValueKind.Null, data.GetProperty("nextCursor").ValueKind);
    }

    [Fact]
    public async Task GetLatestReviews_InvalidCursorParameters_ReturnsBadRequest()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/reviews/latest?afterId=0");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("REVIEW_INVALID_QUERY", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task GetLatestReviews_AnonymousUserCanAccess()
    {
        using var client = factory.CreateClient();
        var (subject, author) = await CreateSubjectAndAuthorAsync();

        await CreateReviewAsync(author.Id, subject.Id, DateTime.UtcNow, "Anonymous latest");

        var response = await client.GetAsync("/api/reviews/latest");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        Assert.True(json.GetProperty("data").GetProperty("totalCount").GetInt32() >= 1);
    }

    private async Task<(Subject Subject, ApplicationUser Author)> CreateSubjectAndAuthorAsync()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var subject = await CreateSubjectAsync(subjectType);
        var author = await CreateUserAsync();
        return (subject, author);
    }

    private async Task<SubjectType> CreateSubjectTypeAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var subjectType = new SubjectType
        {
            Key = $"cursor-type-{Guid.NewGuid():N}",
            DisplayName = $"Cursor Type {Guid.NewGuid():N}"
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
            Name = $"Cursor Subject {Guid.NewGuid():N}",
            Slug = $"cursor-subject-{Guid.NewGuid():N}",
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
            UserName = $"cursor-user-{Guid.NewGuid():N}",
            Email = $"cursor-user-{Guid.NewGuid():N}@example.com",
            EmailConfirmed = true,
            LockoutEnabled = false
        };

        var result = await userManager.CreateAsync(user);
        Assert.True(result.Succeeded, string.Join(",", result.Errors.Select(e => e.Description)));
        return user;
    }

    private async Task<Review> CreateReviewAsync(
        string authorId,
        int subjectId,
        DateTime createdAt,
        string title,
        ReviewStatus status = ReviewStatus.Approved,
        bool isDeleted = false)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var review = new Review
        {
            SubjectId = subjectId,
            UserId = authorId,
            Title = title,
            Content = $"Cursor content for {title}",
            Status = status,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
            IsDeleted = isDeleted,
            MediaCount = 0
        };

        db.Reviews.Add(review);
        await db.SaveChangesAsync();
        return review;
    }

    private static async Task<int> GetLatestTotalCountAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/reviews/latest");
        if (response.StatusCode != HttpStatusCode.OK)
        {
            return 0;
        }

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        if (!json.GetProperty("success").GetBoolean())
        {
            return 0;
        }

        return json.GetProperty("data").GetProperty("totalCount").GetInt32();
    }
}
