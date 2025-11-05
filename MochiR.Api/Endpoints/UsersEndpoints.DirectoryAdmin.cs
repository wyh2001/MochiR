using DotNext;
using DotNext.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using MochiR.Api.Infrastructure.Validation;
using System.Text.Json.Serialization;

namespace MochiR.Api.Endpoints
{
    public static partial class UsersEndpoints
    {
        private static void MapUserDirectoryAndAdminEndpoints(IEndpointRouteBuilder routes)
        {
            var usersGroup = routes.MapGroup("/api/users")
                .WithTags("Users")
                .RequireAuthorization();

            usersGroup.MapGet("/", async (
                string? query,
                int? page,
                int? pageSize,
                string? sort,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext,
                CancellationToken ct) =>
            {
                var pageNumber = page is > 0 ? page.Value : 1;
                var size = pageSize is > 0 ? Math.Min(pageSize.Value, MaxPageSize) : DefaultPageSize;
                var normalizedQuery = string.IsNullOrWhiteSpace(query) ? null : query.Trim();

                var usersQuery = userManager.Users
                    .AsNoTracking()
                    .Where(u => !u.IsDeleted);

                if (!string.IsNullOrWhiteSpace(normalizedQuery))
                {
                    var pattern = $"%{normalizedQuery}%";
                    usersQuery = usersQuery.Where(u =>
                        EF.Functions.Like(u.UserName ?? string.Empty, pattern) ||
                        EF.Functions.Like(u.DisplayName ?? string.Empty, pattern));
                }

                usersQuery = ApplySorting(usersQuery, sort);

                var totalCount = await usersQuery.CountAsync(ct);

                var items = await usersQuery
                    .Skip((pageNumber - 1) * size)
                    .Take(size)
                    .Select(u => new DirectoryUserDto(
                        u.Id,
                        u.UserName,
                        u.DisplayName,
                        u.AvatarUrl,
                        u.CreatedAtUtc))
                    .ToListAsync(ct);

                var payload = new DirectoryPageDto(totalCount, pageNumber, size, items);
                return ApiResults.Ok(payload, httpContext);
            }).WithOpenApi();

            usersGroup.MapGet("/{id}", async (
                string id,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext,
                CancellationToken ct) =>
            {
                var user = await userManager.Users
                    .AsNoTracking()
                    .Where(u => u.Id == id && !u.IsDeleted)
                    .Select(u => new DirectoryUserDetailDto(
                        u.Id,
                        u.UserName,
                        u.DisplayName,
                        u.AvatarUrl,
                        u.CreatedAtUtc))
                    .FirstOrDefaultAsync(ct);

                if (user is null)
                {
                    return ApiResults.Failure(
                        "USER_NOT_FOUND",
                        "User not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                SensitiveUserInfoDto? sensitive = null;
                if (httpContext.User.IsInRole(AppRoles.Admin))
                {
                    var managedUser = await userManager.FindByIdAsync(id);
                    if (managedUser is not null)
                    {
                        var roles = await userManager.GetRolesAsync(managedUser);
                        sensitive = new SensitiveUserInfoDto(
                            managedUser.Email,
                            managedUser.EmailConfirmed,
                            managedUser.PhoneNumber,
                            managedUser.PhoneNumberConfirmed,
                            managedUser.TwoFactorEnabled,
                            managedUser.LockoutEnabled,
                            managedUser.LockoutEnd,
                            roles.ToArray());
                    }
                }

                var payload = new UserDirectoryResponseDto(user, sensitive);
                return ApiResults.Ok(payload, httpContext);
            }).WithOpenApi();

            var adminGroup = usersGroup.MapGroup(string.Empty)
                .RequireAuthorization(policy => policy.RequireRole(AppRoles.Admin));

            adminGroup.MapPost("/", async (
                CreateUserDto dto,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext) =>
            {
                var user = new ApplicationUser
                {
                    UserName = dto.UserName.Trim(),
                    Email = dto.Email.Trim(),
                    DisplayName = dto.DisplayName?.Trim(),
                    AvatarUrl = dto.AvatarUrl?.Trim(),
                    CreatedAtUtc = DateTime.UtcNow,
                    EmailConfirmed = dto.EmailConfirmed ?? false
                };

                var result = await userManager.CreateAsync(user, dto.Password);
                if (!result.Succeeded)
                {
                    return ApiResults.Failure(
                        "USER_CREATE_FAILED",
                        "Failed to create user.",
                        httpContext,
                        StatusCodes.Status400BadRequest,
                        BuildIdentityErrorDetails(result));
                }

                if (dto.Roles?.Any() == true)
                {
                    var rolesToAssign = dto.Roles.Where(r => !string.IsNullOrWhiteSpace(r)).Select(r => r.Trim());
                    var roleResult = await userManager.AddToRolesAsync(user, rolesToAssign);
                    if (!roleResult.Succeeded)
                    {
                        return ApiResults.Failure(
                            "USER_ROLE_ASSIGN_FAILED",
                            "User created but role assignment failed.",
                            httpContext,
                            StatusCodes.Status400BadRequest,
                            BuildIdentityErrorDetails(roleResult));
                    }
                }

                var detail = await BuildAdminDetailAsync(userManager, user.Id);
                return ApiResults.Created($"/api/users/{user.Id}", detail, httpContext);
            })
            .AddValidation<CreateUserDto>(
                "USER_CREATE_INVALID_PAYLOAD",
                "User name, email, and password are required.")
            .WithOpenApi();

            adminGroup.MapPatch("/{id}", async (
                string id,
                DirectoryAdminPatchRequestDto dto,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext) =>
            {
                var user = await userManager.FindByIdAsync(id);
                if (user is not { IsDeleted: false })
                {
                    return ApiResults.Failure(
                        "USER_NOT_FOUND",
                        "User not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                ApplyOptionalTrimmedString(dto.DisplayName, value => user.DisplayName = value);
                ApplyOptionalTrimmedString(dto.AvatarUrl, value => user.AvatarUrl = value);
                ApplyOptionalTrimmedString(dto.PhoneNumber, value => user.PhoneNumber = value);

                if (dto.Email.TryGet(out var emailValue))
                {
                    user.Email = emailValue.Trim();
                }

                ApplyOptionalBool(dto.EmailConfirmed, value => user.EmailConfirmed = value);
                ApplyOptionalBool(dto.PhoneNumberConfirmed, value => user.PhoneNumberConfirmed = value);
                ApplyOptionalBool(dto.TwoFactorEnabled, value => user.TwoFactorEnabled = value);

                var updateResult = await userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    return ApiResults.Failure(
                        "USER_UPDATE_FAILED",
                        "Failed to update user.",
                        httpContext,
                        StatusCodes.Status400BadRequest,
                        BuildIdentityErrorDetails(updateResult));
                }

                if (!dto.Roles.IsUndefined)
                {
                    var desiredRoles = dto.Roles.IsNull
                        ? Array.Empty<string>()
                        : dto.Roles.TryGet(out var providedRoles) && providedRoles is not null
                            ? providedRoles
                                .Where(r => !string.IsNullOrWhiteSpace(r))
                                .Select(r => r.Trim())
                                .Distinct(StringComparer.OrdinalIgnoreCase)
                                .ToArray()
                            : Array.Empty<string>();

                    var currentRoles = await userManager.GetRolesAsync(user);

                    var rolesToRemove = currentRoles
                        .Where(r => !desiredRoles.Contains(r, StringComparer.OrdinalIgnoreCase))
                        .ToArray();

                    var rolesToAdd = desiredRoles
                        .Where(r => !currentRoles.Contains(r, StringComparer.OrdinalIgnoreCase))
                        .ToArray();

                    if (rolesToRemove.Length > 0)
                    {
                        var removeResult = await userManager.RemoveFromRolesAsync(user, rolesToRemove);
                        if (!removeResult.Succeeded)
                        {
                            return ApiResults.Failure(
                                "USER_ROLE_REMOVE_FAILED",
                                "Failed to remove roles from user.",
                                httpContext,
                                StatusCodes.Status400BadRequest,
                                BuildIdentityErrorDetails(removeResult));
                        }
                    }

                    if (rolesToAdd.Length > 0)
                    {
                        var addResult = await userManager.AddToRolesAsync(user, rolesToAdd);
                        if (!addResult.Succeeded)
                        {
                            return ApiResults.Failure(
                                "USER_ROLE_ADD_FAILED",
                                "Failed to add roles to user.",
                                httpContext,
                                StatusCodes.Status400BadRequest,
                                BuildIdentityErrorDetails(addResult));
                        }
                    }
                }

                var detail = await BuildAdminDetailAsync(userManager, user.Id);
                return ApiResults.Ok(detail, httpContext);
            })
            .Accepts<DirectoryAdminPatchRequestDto>("application/json")
            .WithMetadata(new InvalidPayloadMetadata(
                "USER_INVALID_PAYLOAD",
                "One or more fields are invalid."))
            .AddValidation<DirectoryAdminPatchRequestDto>(
                "USER_INVALID_PAYLOAD",
                "One or more fields are invalid.")
            .WithOpenApi();

            adminGroup.MapPost("/{id}/lock", async (
                string id, LockUserRequestDto dto,
                UserManager<ApplicationUser> userManager,
                HttpContext httpContext) =>
            {
                var user = await userManager.FindByIdAsync(id);
                if (user is not { IsDeleted: false })
                {
                    return ApiResults.Failure(
                        "USER_NOT_FOUND",
                        "User not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                if (dto.Unlock == true)
                {
                    var unlockResult = await userManager.SetLockoutEndDateAsync(user, null);
                    if (!unlockResult.Succeeded)
                    {
                        return ApiResults.Failure(
                            "USER_UNLOCK_FAILED",
                            "Failed to unlock user.",
                            httpContext,
                            StatusCodes.Status400BadRequest,
                            BuildIdentityErrorDetails(unlockResult));
                    }

                    return ApiResults.Ok(new UserLockResponseDto(user.Id, null), httpContext);
                }

                var until = dto.Until ?? DateTimeOffset.MaxValue;
                user.LockoutEnabled = true;

                var lockResult = await userManager.SetLockoutEndDateAsync(user, until);
                if (!lockResult.Succeeded)
                {
                    return ApiResults.Failure(
                        "USER_LOCK_FAILED",
                        "Failed to lock user.",
                        httpContext,
                        StatusCodes.Status400BadRequest,
                        BuildIdentityErrorDetails(lockResult));
                }

                var updateResult = await userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    return ApiResults.Failure(
                        "USER_LOCK_FAILED",
                        "Failed to lock user.",
                        httpContext,
                        StatusCodes.Status400BadRequest,
                        BuildIdentityErrorDetails(updateResult));
                }

                return ApiResults.Ok(new UserLockResponseDto(user.Id, until), httpContext);
            }).WithOpenApi();

            adminGroup.MapDelete("/{id}", async (
                string id, UserManager<ApplicationUser> userManager,
                HttpContext httpContext) =>
            {
                var user = await userManager.FindByIdAsync(id);
                if (user is not { IsDeleted: false })
                {
                    return ApiResults.Failure(
                        "USER_NOT_FOUND",
                        "User not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                user.IsDeleted = true;
                user.LockoutEnabled = true;
                var lockResult = await userManager.SetLockoutEndDateAsync(user, DateTimeOffset.MaxValue);
                if (!lockResult.Succeeded)
                {
                    return ApiResults.Failure(
                        "USER_SOFT_DELETE_FAILED",
                        "Failed to delete user.",
                        httpContext,
                        StatusCodes.Status400BadRequest,
                        BuildIdentityErrorDetails(lockResult));
                }

                var deleteResult = await userManager.UpdateAsync(user);
                if (!deleteResult.Succeeded)
                {
                    return ApiResults.Failure(
                        "USER_SOFT_DELETE_FAILED",
                        "Failed to delete user.",
                        httpContext,
                        StatusCodes.Status400BadRequest,
                        BuildIdentityErrorDetails(deleteResult));
                }

                return ApiResults.Ok(new UserDeleteResponseDto(user.Id, user.IsDeleted), httpContext);
            }).WithOpenApi();
        }

        /// <summary>
        /// Applies ordering to the supplied user query based on the client-provided <paramref name="sort"/> token.
        /// Supports a leading '-' character to indicate descending order, recognises "createdAt"/"createdAtUtc" and
        /// "displayName" keys, and falls back to alphabetical ordering by user name when the token is missing or unknown.
        /// </summary>
        /// <param name="query">The base user query to order.</param>
        /// <param name="sort">An optional sort token, e.g. "displayName" or "-createdAtUtc".</param>
        /// <returns>The ordered query.</returns>
        private static IQueryable<ApplicationUser> ApplySorting(IQueryable<ApplicationUser> query, string? sort)
        {
            if (string.IsNullOrWhiteSpace(sort))
            {
                return query.OrderBy(u => u.UserName);
            }

            var normalized = sort.Trim();
            var descending = normalized.StartsWith('-');
            var key = descending ? normalized[1..] : normalized;
            key = key.ToLowerInvariant();

            return key switch
            {
                "createdat" or "createdatutc" => descending
                    ? query.OrderByDescending(u => u.CreatedAtUtc)
                    : query.OrderBy(u => u.CreatedAtUtc),
                "displayname" => descending
                    ? query.OrderByDescending(u => u.DisplayName)
                    : query.OrderBy(u => u.DisplayName),
                _ => descending
                    ? query.OrderByDescending(u => u.UserName)
                    : query.OrderBy(u => u.UserName)
            };
        }

        private static async Task<UserDirectoryResponseDto?> BuildAdminDetailAsync(UserManager<ApplicationUser> userManager, string userId)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is not { IsDeleted: false })
            {
                return null;
            }

            var publicDto = new DirectoryUserDetailDto(
                user.Id,
                user.UserName,
                user.DisplayName,
                user.AvatarUrl,
                user.CreatedAtUtc);

            var roles = await userManager.GetRolesAsync(user);
            var sensitive = new SensitiveUserInfoDto(
                user.Email,
                user.EmailConfirmed,
                user.PhoneNumber,
                user.PhoneNumberConfirmed,
                user.TwoFactorEnabled,
                user.LockoutEnabled,
                user.LockoutEnd,
                roles.ToArray());

            return new UserDirectoryResponseDto(publicDto, sensitive);
        }
        private record DirectoryUserDto(string Id, string? UserName, string? DisplayName, string? AvatarUrl, DateTime CreatedAtUtc);

        private record DirectoryPageDto(int TotalCount, int Page, int PageSize, IReadOnlyCollection<DirectoryUserDto> Items);

        private record DirectoryUserDetailDto(string Id, string? UserName, string? DisplayName, string? AvatarUrl, DateTime CreatedAtUtc);

        private record SensitiveUserInfoDto(
            string? Email,
            bool EmailConfirmed,
            string? PhoneNumber,
            bool PhoneNumberConfirmed,
            bool TwoFactorEnabled,
            bool LockoutEnabled,
            DateTimeOffset? LockoutEnd,
            IReadOnlyCollection<string> Roles);

        private record UserDirectoryResponseDto(DirectoryUserDetailDto Public, SensitiveUserInfoDto? Sensitive);

        internal sealed record CreateUserDto
        {
            public required string UserName { get; init; }
            public required string Email { get; init; }
            public required string Password { get; init; }
            public string? DisplayName { get; init; }
            public string? AvatarUrl { get; init; }
            public bool? EmailConfirmed { get; init; }
            public IEnumerable<string>? Roles { get; init; }
        }

        private sealed record LockUserRequestDto
        {
            public DateTimeOffset? Until { get; init; }
            public bool? Unlock { get; init; }
        }

        private record UserLockResponseDto(string UserId, DateTimeOffset? LockoutEnd);

        private record UserDeleteResponseDto(string UserId, bool IsDeleted);

        internal sealed record DirectoryAdminPatchRequestDto
        {
            [JsonConverter(typeof(OptionalConverterFactory))]
            [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
            public Optional<string?> DisplayName { get; init; }

            [JsonConverter(typeof(OptionalConverterFactory))]
            [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
            public Optional<string?> AvatarUrl { get; init; }

            [JsonConverter(typeof(OptionalConverterFactory))]
            [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
            public Optional<string?> PhoneNumber { get; init; }

            [JsonConverter(typeof(OptionalConverterFactory))]
            [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
            public Optional<string?> Email { get; init; }

            [JsonConverter(typeof(OptionalConverterFactory))]
            [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
            public Optional<bool?> EmailConfirmed { get; init; }

            [JsonConverter(typeof(OptionalConverterFactory))]
            [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
            public Optional<bool?> PhoneNumberConfirmed { get; init; }

            [JsonConverter(typeof(OptionalConverterFactory))]
            [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
            public Optional<bool?> TwoFactorEnabled { get; init; }

            [JsonConverter(typeof(OptionalConverterFactory))]
            [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
            public Optional<IReadOnlyList<string>?> Roles { get; init; }
        }
    }
}
