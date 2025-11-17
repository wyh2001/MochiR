using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Tests.Endpoints;

public sealed class RatingsEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory factory;

    public RatingsEndpointsTests(CustomWebApplicationFactory factory)
    {
        this.factory = factory;
    }

    [Fact]
    public async Task GetSubjectAggregate_NotFound_ReturnsFailure()
    {
        using var client = factory.CreateClientWithCookies();

        var response = await client.GetAsync("/api/ratings/subjects/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("RATINGS_SUBJECT_NOT_FOUND", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task GetSubjectAggregate_ReturnsAggregate()
    {
        var subject = await CreateSubjectAsync();
        await CreateAggregateAsync(subject.Id, 10, 4.5m);
        using var client = factory.CreateClientWithCookies();

        var response = await client.GetAsync($"/api/ratings/subjects/{subject.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(subject.Id, data.GetProperty("subjectId").GetInt32());
        Assert.Equal(10, data.GetProperty("countReviews").GetInt32());
        Assert.Equal(4.5m, data.GetProperty("avgOverall").GetDecimal());
        var metrics = data.GetProperty("metrics").EnumerateArray().ToList();
        Assert.Contains(metrics, metric => metric.GetProperty("key").GetString() == "quality");
    }

    [Fact]
    public async Task PostSubjectAggregate_WithoutAuthentication_ReturnsUnauthorized()
    {
        var subject = await CreateSubjectAsync();
        using var client = factory.CreateClientWithCookies();
        var payload = new
        {
            CountReviews = 3,
            AvgOverall = 4.2m,
            Metrics = new[]
            {
                new { Key = "quality", Value = 4.2m, Count = 3, Note = "solid" }
            }
        };

        var response = await client.PostAsJsonAsync($"/api/ratings/subjects/{subject.Id}", payload);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostSubjectAggregate_WithNonAdminUser_ReturnsForbidden()
    {
        var subject = await CreateSubjectAsync();
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);
        var payload = new
        {
            CountReviews = 2,
            AvgOverall = 4.0m,
            Metrics = Array.Empty<object>()
        };

        var response = await client.PostAsJsonAsync($"/api/ratings/subjects/{subject.Id}", payload);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PostSubjectAggregate_InvalidSubject_ReturnsFailure()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);
        var payload = new { CountReviews = 1, AvgOverall = 4.0m, Metrics = Array.Empty<object>() };

        var response = await client.PostAsJsonAsync("/api/ratings/subjects/123456", payload);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(body.GetProperty("success").GetBoolean());
        Assert.Equal("RATINGS_SUBJECT_NOT_FOUND", body.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PostSubjectAggregate_WithInvalidMetrics_ReturnsFailure()
    {
        var subject = await CreateSubjectAsync();
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);
        var payload = new { CountReviews = -1, AvgOverall = 4.0m, Metrics = Array.Empty<object>() };

        var response = await client.PostAsJsonAsync($"/api/ratings/subjects/{subject.Id}", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(body.GetProperty("success").GetBoolean());
        Assert.Equal("RATINGS_INVALID_COUNT", body.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task PostSubjectAggregate_CreatesOrUpdatesAggregate()
    {
        var subject = await CreateSubjectAsync();
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsAdminAsync(factory);
        var payload = new
        {
            CountReviews = 5,
            AvgOverall = 4.3m,
            Metrics = new[]
            {
                new { Key = "quality", Value = 4.3m, Count = 5, Note = "great" },
                new { Key = "service", Value = 4.1m, Count = 5, Note = "good" }
            }
        };

        var response = await client.PostAsJsonAsync($"/api/ratings/subjects/{subject.Id}", payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(subject.Id, data.GetProperty("subjectId").GetInt32());
        Assert.Equal(5, data.GetProperty("countReviews").GetInt32());
        Assert.Equal(4.3m, data.GetProperty("avgOverall").GetDecimal());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var aggregate = await db.Aggregates.Include(a => a.Metrics).FirstOrDefaultAsync(a => a.SubjectId == subject.Id);
        Assert.NotNull(aggregate);
        Assert.Equal(5, aggregate!.CountReviews);
        Assert.Equal(4.3m, aggregate.AvgOverall);
        Assert.Equal(2, aggregate.Metrics.Count);
        Assert.Contains(aggregate.Metrics, metric => metric.Key == "service" && metric.Note == "good");
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

    private async Task CreateAggregateAsync(int subjectId, int countReviews, decimal avgOverall)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var aggregate = new Aggregate
        {
            SubjectId = subjectId,
            CountReviews = countReviews,
            AvgOverall = avgOverall,
            Metrics = new List<AggregateMetric>
            {
                new() { Key = "quality", Value = avgOverall, Count = countReviews, Note = "seed" }
            },
            UpdatedAt = DateTime.UtcNow
        };

        db.Aggregates.Add(aggregate);
        await db.SaveChangesAsync();
    }
}
