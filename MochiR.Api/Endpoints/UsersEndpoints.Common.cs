using Microsoft.AspNetCore.Identity;
using MochiR.Api.Entities;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace MochiR.Api.Endpoints
{
    public static partial class UsersEndpoints
    {
        /// <summary>
        /// Retrieves the currently authenticated user or null when the principal cannot be resolved.
        /// </summary>
        private static Task<ApplicationUser?> GetCurrentUserAsync(UserManager<ApplicationUser> userManager, HttpContext httpContext)
            => userManager.GetUserAsync(httpContext.User);

        /// <summary>
        /// Flattens identity errors into a dictionary grouped by code for downstream serialization.
        /// </summary>
        private static IReadOnlyDictionary<string, string[]> BuildIdentityErrorDetails(IdentityResult result)
            => result.Errors
                .GroupBy(error => error.Code)
                .ToDictionary(group => group.Key, group => group.Select(error => error.Description).ToArray());

        /// <summary>
        /// Applies a string value to the target when the property exists, accepting explicit nulls.
        /// </summary>
        private static bool TryApplyString(JsonObject payload, string key, Action<string?> assign)
        {
            if (!TryGetNode(payload, key, out var node))
            {
                return true;
            }

            if (!TryReadTrimmedString(node, out var value))
            {
                return false;
            }

            assign(value);
            return true;
        }

        /// <summary>
        /// Applies a boolean value to the target when the property exists, ignoring explicit nulls.
        /// </summary>
        private static bool TryApplyBool(JsonObject payload, string key, Action<bool> assign)
        {
            if (!TryGetNode(payload, key, out var node))
            {
                return true;
            }

            if (node is null || node.GetValueKind() == JsonValueKind.Null)
            {
                return true;
            }

            if (node is JsonValue valueNode && valueNode.TryGetValue<bool>(out var result))
            {
                assign(result);
                return true;
            }

            return false;
        }

        /// <summary>
        /// Reads an optional string property from the payload, accepting explicit nulls.
        /// </summary>
        private static bool TryReadOptionalString(JsonObject payload, string key, out string? value, out bool specified)
        {
            value = null;
            specified = false;

            if (!TryGetNode(payload, key, out var node))
            {
                return true;
            }

            specified = true;
            if (TryReadTrimmedString(node, out var parsed))
            {
                value = parsed;
                return true;
            }

            return false;
        }

        /// <summary>
        /// Reads an optional boolean property from the payload, ignoring explicit nulls.
        /// </summary>
        private static bool TryReadOptionalBool(JsonObject payload, string key, out bool? value, out bool specified)
        {
            value = null;
            specified = false;

            if (!TryGetNode(payload, key, out var node))
            {
                return true;
            }

            if (node is null || node.GetValueKind() == JsonValueKind.Null)
            {
                return true;
            }

            if (node is JsonValue valueNode && valueNode.TryGetValue<bool>(out var parsed))
            {
                value = parsed;
                specified = true;
                return true;
            }

            return false;
        }

        /// <summary>
        /// Attempts to fetch a property value using camelCase or PascalCase naming.
        /// </summary>
        private static bool TryGetNode(JsonObject payload, string key, out JsonNode? node)
        {
            if (payload.TryGetPropertyValue(key, out node))
            {
                return true;
            }

            if (key.Length > 0)
            {
                var pascalKey = char.ToUpperInvariant(key[0]) + key[1..];
                return payload.TryGetPropertyValue(pascalKey, out node);
            }

            node = null;
            return false;
        }

        /// <summary>
        /// Converts a JSON node to a trimmed string while allowing explicit nulls.
        /// </summary>
        private static bool TryReadTrimmedString(JsonNode? node, out string? value)
        {
            if (node is null || node.GetValueKind() == JsonValueKind.Null)
            {
                value = null;
                return true;
            }

            if (node is JsonValue valueNode && valueNode.TryGetValue<string?>(out var str))
            {
                value = str?.Trim();
                return true;
            }

            value = null;
            return false;
        }
    }
}
