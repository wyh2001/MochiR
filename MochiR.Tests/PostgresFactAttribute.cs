using Microsoft.Extensions.Configuration;
using Npgsql;

namespace MochiR.Tests;

[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public sealed class PostgresFactAttribute : FactAttribute
{
    private const string ConnectionName = "DefaultConnection";

    public PostgresFactAttribute()
    {
        try
        {
            var configuration = LoadConfiguration();
            var connectionString = configuration.GetConnectionString(ConnectionName);
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                Skip = "Connection string 'DefaultConnection' is not configured.";
                return;
            }

            using var connection = new NpgsqlConnection(connectionString);
            connection.Open();
            connection.Close();
        }
        catch (Exception ex)
        {
            Skip = $"PostgreSQL unavailable: {ex.Message}";
        }
    }

    private static IConfiguration LoadConfiguration()
    {
        var appSettingsPath = Path.Combine(AppContext.BaseDirectory, "appsettings.Test.json");

        if (!File.Exists(appSettingsPath))
        {
            throw new FileNotFoundException($"appsettings.Test.json not found at {appSettingsPath}");
        }

        return new ConfigurationBuilder()
            .AddJsonFile(appSettingsPath, optional: false)
            .Build();
    }
}
