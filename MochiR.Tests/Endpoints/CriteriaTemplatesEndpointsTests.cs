using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Tests.Endpoints;

public sealed class CriteriaTemplatesEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory factory;
    private readonly HttpClient client;

    public CriteriaTemplatesEndpointsTests(CustomWebApplicationFactory factory)
    {
        this.factory = factory;
        client = factory.CreateClientWithCookies();
    }

    [Fact]
    public async Task Get_ReturnsTemplates()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var expectedKey = $"template-{Guid.NewGuid():N}";
        await CreateTemplateAsync(subjectType.Id, expectedKey, "Template A", isRequired: true);

        var response = await client.GetAsync("/api/criteria-templates");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var items = json.GetProperty("data").EnumerateArray().ToList();
        Assert.Contains(items, item => item.GetProperty("key").GetString() == expectedKey);
    }

    [Fact]
    public async Task Get_WithSubjectTypeFilter_ReturnsOnlyMatching()
    {
        var subjectType1 = await CreateSubjectTypeAsync();
        var subjectType2 = await CreateSubjectTypeAsync();
        var key1 = $"filter-{Guid.NewGuid():N}";
        await CreateTemplateAsync(subjectType1.Id, key1, "Template Filter", true);
        await CreateTemplateAsync(subjectType2.Id, $"other-{Guid.NewGuid():N}", "Other Template", false);

        var response = await client.GetAsync($"/api/criteria-templates?subjectTypeId={subjectType1.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = json.GetProperty("data").EnumerateArray().ToList();
        Assert.All(items, item => Assert.Equal(subjectType1.Id, item.GetProperty("subjectTypeId").GetInt32()));
        Assert.Contains(items, item => item.GetProperty("key").GetString() == key1);
    }

    [Fact]
    public async Task GetById_NotFound_ReturnsFailure()
    {
        var response = await client.GetAsync("/api/criteria-templates/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("CRITERIA_TEMPLATE_NOT_FOUND", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task GetById_ReturnsDetail()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var key = $"detail-{Guid.NewGuid():N}";
        var template = await CreateTemplateAsync(subjectType.Id, key, "Detail Template", false);

        var response = await client.GetAsync($"/api/criteria-templates/{template.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data");
        Assert.Equal(template.Id, data.GetProperty("id").GetInt32());
        Assert.Equal(key, data.GetProperty("key").GetString());
        Assert.Equal(subjectType.Key, data.GetProperty("subjectTypeKey").GetString());
    }

    [Fact]
    public async Task Post_WithInvalidInput_ReturnsFailure()
    {
        await client.SignInAsAdminAsync(factory);
        var subjectType = await CreateSubjectTypeAsync();
        var payload = new { SubjectTypeId = subjectType.Id, Key = " ", DisplayName = "", IsRequired = false };

        var response = await client.PostAsJsonAsync("/api/criteria-templates", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("CRITERIA_TEMPLATE_INVALID_INPUT", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task Post_WithDuplicateKey_ReturnsConflict()
    {
        await client.SignInAsAdminAsync(factory);
        var subjectType = await CreateSubjectTypeAsync();
        var key = $"dup-{Guid.NewGuid():N}";
        await CreateTemplateAsync(subjectType.Id, key, "Original", true);

        var payload = new { SubjectTypeId = subjectType.Id, Key = key, DisplayName = "Duplicate", IsRequired = false };
        var response = await client.PostAsJsonAsync("/api/criteria-templates", payload);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("CRITERIA_TEMPLATE_DUPLICATE_KEY", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task Post_CreatesTemplate()
    {
        await client.SignInAsAdminAsync(factory);
        var subjectType = await CreateSubjectTypeAsync();
        var payload = new { SubjectTypeId = subjectType.Id, Key = "overall", DisplayName = "Overall", IsRequired = true };

        var response = await client.PostAsJsonAsync("/api/criteria-templates", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        var createdId = data.GetProperty("id").GetInt32();
        Assert.Equal(subjectType.Id, data.GetProperty("subjectTypeId").GetInt32());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var template = await db.CriteriaTemplates.FindAsync(createdId);
        Assert.NotNull(template);
        Assert.Equal("overall", template!.Key);
        Assert.Equal("Overall", template.DisplayName);
        Assert.True(template.IsRequired);
    }

    [Fact]
    public async Task Post_WithoutAuthentication_ReturnsUnauthorized()
    {
        var subjectType = await CreateSubjectTypeAsync();
        var payload = new { SubjectTypeId = subjectType.Id, Key = "unauth", DisplayName = "No Auth", IsRequired = false };

        var response = await client.PostAsJsonAsync("/api/criteria-templates", payload);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Post_WithNonAdminUser_ReturnsForbidden()
    {
        await client.SignInAsUserAsync(factory);
        var subjectType = await CreateSubjectTypeAsync();
        var payload = new { SubjectTypeId = subjectType.Id, Key = "forbidden", DisplayName = "Forbidden", IsRequired = true };

        var response = await client.PostAsJsonAsync("/api/criteria-templates", payload);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private async Task<SubjectType> CreateSubjectTypeAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var subjectType = new SubjectType
        {
            Key = $"subject-{Guid.NewGuid():N}",
            DisplayName = "Subject Type"
        };

        db.SubjectTypes.Add(subjectType);
        await db.SaveChangesAsync();
        return subjectType;
    }

    private async Task<CriteriaTemplate> CreateTemplateAsync(int subjectTypeId, string key, string displayName, bool isRequired)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var template = new CriteriaTemplate
        {
            SubjectTypeId = subjectTypeId,
            Key = key,
            DisplayName = displayName,
            IsRequired = isRequired
        };

        db.CriteriaTemplates.Add(template);
        await db.SaveChangesAsync();
        return template;
    }
}
