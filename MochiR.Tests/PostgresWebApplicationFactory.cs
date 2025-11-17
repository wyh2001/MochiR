using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using MochiR.Api.Infrastructure;
using Npgsql;

namespace MochiR.Tests;

public sealed class PostgresWebApplicationFactory : WebApplicationFactory<Program>
{
    private string? databaseName;
    private string? adminConnectionString;
    private string? databaseConnectionString;
    private bool databaseCreated;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((context, configBuilder) =>
        {
            var testSettingsPath = Path.Combine(AppContext.BaseDirectory, "appsettings.Test.json");

            if (!File.Exists(testSettingsPath))
            {
                throw new PostgresTestUnavailableException($"appsettings.Test.json not found at {testSettingsPath}");
            }

            configBuilder.Sources.Clear();
            configBuilder.AddJsonFile(testSettingsPath, optional: false);
            configBuilder.AddEnvironmentVariables();
        });

        builder.ConfigureServices((context, services) =>
        {
            var baseConnectionString = context.Configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

            InitializeConnectionStrings(baseConnectionString);
            EnsureDatabaseCreated();

            var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
            if (descriptor is not null)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<ApplicationDbContext>(options =>
            {
                options.UseNpgsql(databaseConnectionString);
            });
        });
    }

    public static async Task<(PostgresWebApplicationFactory? Factory, string? Error)> TryCreateAsync()
    {
        var factory = new PostgresWebApplicationFactory();

        try
        {
            using var _ = factory.CreateClient();
            await factory.InitializeDatabaseAsync();
            return (factory, null);
        }
        catch (PostgresTestUnavailableException ex)
        {
            factory.Dispose();
            return (null, ex.Message);
        }
    }

    public async Task InitializeDatabaseAsync()
    {
        if (!databaseCreated)
        {
            throw new PostgresTestUnavailableException("PostgreSQL test database was not created.");
        }

        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.MigrateAsync();
    }

    public async Task ResetDatabaseAsync()
    {
        if (!databaseCreated)
        {
            throw new PostgresTestUnavailableException("PostgreSQL test database was not created.");
        }

        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.MigrateAsync();
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (disposing)
        {
            TryDropDatabase();
        }
    }

    private void InitializeConnectionStrings(string baseConnectionString)
    {
        if (databaseConnectionString is not null)
        {
            return;
        }

        databaseName = $"mochir_tests_{Guid.NewGuid():N}";

        var adminBuilder = new NpgsqlConnectionStringBuilder(baseConnectionString)
        {
            Database = "postgres"
        };
        adminConnectionString = adminBuilder.ConnectionString;

        var databaseBuilder = new NpgsqlConnectionStringBuilder(baseConnectionString)
        {
            Database = databaseName
        };
        databaseConnectionString = databaseBuilder.ConnectionString;
    }

    private void EnsureDatabaseCreated()
    {
        if (databaseCreated)
        {
            return;
        }

        if (adminConnectionString is null || databaseName is null)
        {
            throw new PostgresTestUnavailableException("PostgreSQL test database configuration is incomplete.");
        }

        try
        {
            using var adminConnection = new NpgsqlConnection(adminConnectionString);
            adminConnection.Open();

            using (var terminate = adminConnection.CreateCommand())
            {
                terminate.CommandText = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = @name";
                terminate.Parameters.AddWithValue("name", databaseName);
                terminate.ExecuteNonQuery();
            }

            using var command = adminConnection.CreateCommand();
            command.CommandText = $"CREATE DATABASE \"{databaseName}\" ENCODING = 'UTF8'";
            command.ExecuteNonQuery();

            databaseCreated = true;
        }
        catch (PostgresException ex)
        {
            throw new PostgresTestUnavailableException($"PostgreSQL test database creation failed: {ex.Message}", ex);
        }
        catch (Exception ex)
        {
            throw new PostgresTestUnavailableException($"PostgreSQL test database creation failed: {ex.Message}", ex);
        }
    }

    private void TryDropDatabase()
    {
        if (!databaseCreated || adminConnectionString is null || databaseName is null)
        {
            return;
        }

        try
        {
            using var adminConnection = new NpgsqlConnection(adminConnectionString);
            adminConnection.Open();

            using (var terminate = adminConnection.CreateCommand())
            {
                terminate.CommandText = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = @name";
                terminate.Parameters.AddWithValue("name", databaseName);
                terminate.ExecuteNonQuery();
            }

            using var command = adminConnection.CreateCommand();
            command.CommandText = $"DROP DATABASE IF EXISTS \"{databaseName}\"";
            command.ExecuteNonQuery();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Warning: Failed to drop PostgreSQL test database '{databaseName}': {ex.Message}");
        }
    }
}
