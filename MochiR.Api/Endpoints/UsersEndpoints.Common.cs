using DotNext;
using Microsoft.AspNetCore.Identity;
using MochiR.Api.Entities;

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
        /// Applies an optional string to the target, trimming it when present and respecting explicit nulls.
        /// </summary>
        private static void ApplyOptionalTrimmedString(Optional<string?> optional, Action<string?> assign)
        {
            if (optional.IsUndefined)
            {
                return;
            }

            if (optional.IsNull)
            {
                assign(null);
                return;
            }

            if (optional.TryGet(out var value))
            {
                assign(value?.Trim());
            }
        }

        /// <summary>
        /// Applies an optional nullable bool to the target, ignoring undefined or null payloads.
        /// </summary>
        private static void ApplyOptionalBool(Optional<bool?> optional, Action<bool> assign)
        {
            if (optional.HasValue)
            {
                assign(optional.Value!.Value);
            }
        }
    }
}
