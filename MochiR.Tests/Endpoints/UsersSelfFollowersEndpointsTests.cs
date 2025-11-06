using System;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Tests.Endpoints;

public sealed class UsersSelfFollowersEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory factory;

    public UsersSelfFollowersEndpointsTests(CustomWebApplicationFactory factory)
    {
        this.factory = factory;
    }

    [Fact]
    public async Task GetFollowers_ReturnsUsersWhoFollowMe()
    {
        using var client = factory.CreateClientWithCookies();
        var me = await client.SignInAsUserAsync(factory);

        using var followerClient = factory.CreateClientWithCookies();
        var follower = await followerClient.SignInAsUserAsync(factory);

        var followResponse = await followerClient.PostAsync($"/api/follows/users/{me.Id}", null);
        Assert.Equal(HttpStatusCode.Created, followResponse.StatusCode);

        var response = await client.GetAsync("/api/me/followers");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(1, data.GetProperty("totalCount").GetInt32());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Single(items);
        var followerEntry = items[0];
        Assert.Equal(follower.Id, followerEntry.GetProperty("userId").GetString());
    }

    [Fact]
    public async Task GetFollowing_ReturnsUsersIFollow()
    {
        using var client = factory.CreateClientWithCookies();
        var me = await client.SignInAsUserAsync(factory);
        var target = await CreateUserAsync();

        var followResponse = await client.PostAsync($"/api/follows/users/{target.Id}", null);
        Assert.Equal(HttpStatusCode.Created, followResponse.StatusCode);

        var response = await client.GetAsync("/api/me/following");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(1, data.GetProperty("totalCount").GetInt32());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Single(items);
        var followingEntry = items[0];
        Assert.Equal(target.Id, followingEntry.GetProperty("userId").GetString());
    }

    [Fact]
    public async Task GetFollowers_WithoutAuthentication_ReturnsUnauthorized()
    {
        using var client = factory.CreateClientWithCookies();

        var response = await client.GetAsync("/api/me/followers");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetFollowing_WithoutAuthentication_ReturnsUnauthorized()
    {
        using var client = factory.CreateClientWithCookies();

        var response = await client.GetAsync("/api/me/following");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetFollowers_NoFollowers_ReturnsEmptyList()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var response = await client.GetAsync("/api/me/followers");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.Equal(0, data.GetProperty("totalCount").GetInt32());
        var items = data.GetProperty("items").EnumerateArray().ToList();
        Assert.Empty(items);
    }

    [Fact]
    public async Task GetFollowers_InvalidPagination_ReturnsBadRequest()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var response = await client.GetAsync("/api/me/followers?page=0");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("FOLLOW_INVALID_QUERY", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task GetFollowing_InvalidPagination_ReturnsBadRequest()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var response = await client.GetAsync("/api/me/following?pageSize=0");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("FOLLOW_INVALID_QUERY", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task DeleteFollower_RemovesFollower()
    {
        using var client = factory.CreateClientWithCookies();
        var me = await client.SignInAsUserAsync(factory);

        using var followerClient = factory.CreateClientWithCookies();
        var follower = await followerClient.SignInAsUserAsync(factory);

        var followResponse = await followerClient.PostAsync($"/api/follows/users/{me.Id}", null);
        Assert.Equal(HttpStatusCode.Created, followResponse.StatusCode);

        var response = await client.DeleteAsync($"/api/me/followers/{follower.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        Assert.True(json.GetProperty("data").GetProperty("removed").GetBoolean());

        var listResponse = await client.GetAsync("/api/me/followers");
        var listJson = await listResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, listJson.GetProperty("data").GetProperty("totalCount").GetInt32());

        var followerListResponse = await followerClient.GetAsync("/api/follows/users");
        var followerListJson = await followerListResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(followerListJson.GetProperty("success").GetBoolean());
        Assert.Equal(0, followerListJson.GetProperty("data").GetProperty("totalCount").GetInt32());
    }

    [Fact]
    public async Task DeleteFollower_NotFound_ReturnsFailure()
    {
        using var client = factory.CreateClientWithCookies();
        await client.SignInAsUserAsync(factory);

        var response = await client.DeleteAsync("/api/me/followers/unknown-user");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("success").GetBoolean());
        Assert.Equal("FOLLOW_NOT_FOUND", json.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task DeleteFollower_WithoutAuthentication_ReturnsUnauthorized()
    {
        using var client = factory.CreateClientWithCookies();

        var response = await client.DeleteAsync("/api/me/followers/some-user");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
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
}
