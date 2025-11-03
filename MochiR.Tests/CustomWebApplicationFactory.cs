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
