using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore.Storage;
using MochiR.Api.Infrastructure;
using MochiR.Api.Services.Email;

namespace MochiR.Tests;

public sealed class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    // Use a shared InMemoryDatabaseRoot to persist data accross different test cases
    private static readonly InMemoryDatabaseRoot DatabaseRoot = new();

    // Override ConfigureWebHost to customize it for testing
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove the existing ApplicationDbContext registration
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));

            if (descriptor is not null)
            {
                services.Remove(descriptor);
            }

            // Register the one created for testing
            services.AddDbContext<ApplicationDbContext>(options =>
            {
                options.UseInMemoryDatabase("TestDb", DatabaseRoot);
            });

            services.AddSingleton<IEmailSender, NoopEmailSender>();
        });
    }
}

/// <summary>
/// Provide an isolated in-memory database for tests that rely on precise counts or ordering.
/// </summary>
public sealed class IsolatedDbWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string databaseName = $"IsolatedTestDb-{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));

            if (descriptor is not null)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<ApplicationDbContext>(options =>
            {
                // Each isolated factory gets its own database to avoid cross-test pollution.
                options.UseInMemoryDatabase(databaseName);
            });

            services.AddSingleton<IEmailSender, NoopEmailSender>();
        });
    }

    /// <summary>
    /// Force the underlying in-memory database to restart so each test runs against a clean state.
    /// </summary>
    public async Task ResetDatabaseAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();
    }
}
