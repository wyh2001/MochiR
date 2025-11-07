using System.Text.Json;

namespace MochiR.Tests.Helpers;

public static class TestResponseHelper
{
    public static async Task<(JsonElement Json, string Raw)> ReadJsonWithRawAsync(this HttpResponseMessage response)
    {
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var raw = JsonSerializer.Serialize(json);
        return (json, raw);
    }

    public static async Task<int> GetTotalCountAsync(this HttpClient client, string path)
    {
        var response = await client.GetAsync(path);
        if (response.StatusCode != HttpStatusCode.OK)
        {
            return 0;
        }

        var (json, _) = await response.ReadJsonWithRawAsync();
        if (!json.GetProperty("success").GetBoolean())
        {
            return 0;
        }

        return json.GetProperty("data").GetProperty("totalCount").GetInt32();
    }

    public static string BuildCursorQuery(string basePath, int pageSize, JsonElement cursor)
    {
        var createdAt = cursor.GetProperty("createdAtUtc").GetDateTime().ToString("O");
        var reviewId = cursor.GetProperty("reviewId").GetInt64();
        var separator = basePath.Contains('?') ? "&" : "?";
        return $"{basePath}{separator}pageSize={pageSize}&after={Uri.EscapeDataString(createdAt)}&afterId={reviewId}";
    }

}
