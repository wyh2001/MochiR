using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Tests.Endpoints;

public sealed class SearchEndpointsTests
{
    [PostgresFact]
    public async Task GetSearch_WithEmptyQuery_ReturnsBadRequest()
    {
        using var factory = await CreateFactoryOrSkipAsync();
        await factory.ResetDatabaseAsync();
        using var client = factory.CreateClientWithCookies();

        var response = await client.GetAsync("/api/search?query=");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("SEARCH_QUERY_REQUIRED", json.GetProperty("error").GetProperty("code").GetString());
    }

    [PostgresFact]
    public async Task GetSearch_ReturnsSubjectsAndReviews()
    {
        using var factory = await CreateFactoryOrSkipAsync();
        await factory.ResetDatabaseAsync();
        await SeedSampleDataAsync(factory);
        using var client = factory.CreateClientWithCookies();

        var response = await client.GetAsync("/api/search?query=coffee");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var results = json.GetProperty("data").GetProperty("results").EnumerateArray().ToList();
        Assert.NotEmpty(results);
        Assert.Contains(results, item => item.GetProperty("type").GetString() == "Subject");
        Assert.Contains(results, item => item.GetProperty("type").GetString() == "Review");
        Assert.All(results, item => Assert.Contains("coffee", item.GetProperty("title").GetString()!, StringComparison.OrdinalIgnoreCase));
    }

    [PostgresFact]
    public async Task GetSearch_WithCursor_PaginatesResults()
    {
        using var factory = await CreateFactoryOrSkipAsync();
        await factory.ResetDatabaseAsync();
        await SeedSampleDataAsync(factory);
        using var client = factory.CreateClientWithCookies();

        var firstResponse = await client.GetAsync("/api/search?query=coffee&limit=1");
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        var firstJson = await firstResponse.Content.ReadFromJsonAsync<JsonElement>();
        var firstData = firstJson.GetProperty("data");
        var firstResults = firstData.GetProperty("results").EnumerateArray().ToList();
        Assert.Single(firstResults);
        var cursor = firstData.GetProperty("nextCursor").GetString();
        Assert.False(string.IsNullOrWhiteSpace(cursor));

        var secondResponse = await client.GetAsync($"/api/search?query=coffee&limit=1&cursor={Uri.EscapeDataString(cursor!)}");
        Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);
        var secondJson = await secondResponse.Content.ReadFromJsonAsync<JsonElement>();
        var secondData = secondJson.GetProperty("data");
        var secondResults = secondData.GetProperty("results").EnumerateArray().ToList();
        Assert.Single(secondResults);
        Assert.NotEqual(
            firstResults[0].GetProperty("title").GetString(),
            secondResults[0].GetProperty("title").GetString());
    }

    private static async Task SeedSampleDataAsync(PostgresWebApplicationFactory factory)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var firstUser = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            UserName = "coffee-fan",
            NormalizedUserName = "COFFEE-FAN",
            Email = "coffee-fan@example.com",
            NormalizedEmail = "COFFEE-FAN@EXAMPLE.COM",
            EmailConfirmed = true,
            DisplayName = "Coffee Fan"
        };

        var secondUser = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            UserName = "brew-enthusiast",
            NormalizedUserName = "BREW-ENTHUSIAST",
            Email = "brew-enthusiast@example.com",
            NormalizedEmail = "BREW-ENTHUSIAST@EXAMPLE.COM",
            EmailConfirmed = true,
            DisplayName = "Brew Enthusiast"
        };

        db.Users.AddRange(firstUser, secondUser);
        await db.SaveChangesAsync();

        var subjectType = new SubjectType
        {
            Key = "coffee-shop",
            DisplayName = "Coffee Shop"
        };
        db.SubjectTypes.Add(subjectType);
        await db.SaveChangesAsync();

        var firstSubject = new Subject
        {
            Name = "Coffee Collective",
            Slug = "coffee-collective",
            SubjectTypeId = subjectType.Id,
            CreatedAt = DateTime.UtcNow
        };
        var secondSubject = new Subject
        {
            Name = "Coffee Archive",
            Slug = "coffee-archive",
            SubjectTypeId = subjectType.Id,
            CreatedAt = DateTime.UtcNow.AddMinutes(1)
        };

        db.Subjects.AddRange(firstSubject, secondSubject);
        await db.SaveChangesAsync();

        var firstReview = new Review
        {
            SubjectId = firstSubject.Id,
            Subject = firstSubject,
            UserId = firstUser.Id,
            User = firstUser,
            Title = "Best coffee in town",
            Excerpt = "A delightful coffee experience.",
            Content = "Coffee lovers should visit this place.",
            CreatedAt = DateTime.UtcNow.AddMinutes(2)
        };

        var secondReview = new Review
        {
            SubjectId = secondSubject.Id,
            Subject = secondSubject,
            UserId = secondUser.Id,
            User = secondUser,
            Title = "Cozy coffee corner",
            Excerpt = "Lovely coffee aroma everywhere.",
            Content = "Great coffee and atmosphere.",
            CreatedAt = DateTime.UtcNow.AddMinutes(3)
        };

        db.Reviews.AddRange(firstReview, secondReview);
        await db.SaveChangesAsync();
    }

    private static async Task<PostgresWebApplicationFactory> CreateFactoryOrSkipAsync()
    {
        var (factory, error) = await PostgresWebApplicationFactory.TryCreateAsync();
        if (factory is not null)
        {
            return factory;
        }

        var reason = string.IsNullOrWhiteSpace(error)
            ? "PostgreSQL is not available for search tests."
            : error!;

        throw new PostgresTestUnavailableException(reason);
    }
}
