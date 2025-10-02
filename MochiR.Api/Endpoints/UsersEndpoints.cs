using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Api.Endpoints
{
    public static class UsersEndpoints
    {
        private const int DefaultPageSize = 20;
        private const int MaxPageSize = 100;

        public static void MapUsersEndpoints(this IEndpointRouteBuilder routes)
        {
            MapSelfEndpoints(routes);
            MapUserDirectoryAndAdminEndpoints(routes);
        }

        private static void MapSelfEndpoints(IEndpointRouteBuilder routes)
        {
            var selfGroup = routes.MapGroup("/api/me")
                .WithTags("Self")
                .RequireAuthorization();

            selfGroup.MapGet("/", async (UserManager<ApplicationUser> userManager, HttpContext httpContext) =>
            {
                var user = await GetCurrentUserAsync(userManager, httpContext);
                if (user is null)
                {
                    return ApiResults.Failure(
                        "SELF_NOT_FOUND",
                        "Unable to resolve the current user.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                return ApiResults.Ok(ToSelfProfile(user), httpContext);
            }).WithOpenApi();

            selfGroup.MapPatch("/", async (UpdateSelfProfileDto dto, UserManager<ApplicationUser> userManager, HttpContext httpContext) =>
            {
                var user = await GetCurrentUserAsync(userManager, httpContext);
                if (user is null)
                {
                    return ApiResults.Failure(
                        "SELF_NOT_FOUND",
                        "Unable to resolve the current user.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                if (dto.DisplayName is not null)
                {
                    user.DisplayName = NormalizeOrNull(dto.DisplayName);
                }

                if (dto.AvatarUrl is not null)
                {
                    user.AvatarUrl = NormalizeOrNull(dto.AvatarUrl);
                }

                if (dto.PhoneNumber is not null)
                {
                    user.PhoneNumber = NormalizeOrNull(dto.PhoneNumber);
                }

                var updateResult = await userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    return ToIdentityFailure(updateResult, httpContext, "SELF_UPDATE_FAILED", "Failed to update profile.", StatusCodes.Status400BadRequest);
                }

                return ApiResults.Ok(ToSelfProfile(user), httpContext);
            }).WithOpenApi();

            selfGroup.MapPost("/avatar", async (UpdateAvatarDto dto, UserManager<ApplicationUser> userManager, HttpContext httpContext) =>
            {
                var user = await GetCurrentUserAsync(userManager, httpContext);
                if (user is null)
                {
                    return ApiResults.Failure(
                        "SELF_NOT_FOUND",
                        "Unable to resolve the current user.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                user.AvatarUrl = NormalizeOrNull(dto.AvatarUrl);

                var updateResult = await userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    return ToIdentityFailure(updateResult, httpContext, "SELF_AVATAR_UPDATE_FAILED", "Failed to update avatar.", StatusCodes.Status400BadRequest);
                }

                return ApiResults.Ok(new AvatarUpdatedDto(user.AvatarUrl), httpContext);
            }).WithOpenApi();

            selfGroup.MapGet("/security", async (UserManager<ApplicationUser> userManager, HttpContext httpContext) =>
            {
                var user = await GetCurrentUserAsync(userManager, httpContext);
                if (user is null)
                {
                    return ApiResults.Failure(
                        "SELF_NOT_FOUND",
                        "Unable to resolve the current user.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                var roles = await userManager.GetRolesAsync(user);
                var payload = new SelfSecurityDto(
                    user.Email,
                    user.EmailConfirmed,
                    user.PhoneNumber,
                    user.PhoneNumberConfirmed,
                    user.TwoFactorEnabled,
                    user.LockoutEnd,
                    roles.ToArray());

                return ApiResults.Ok(payload, httpContext);
            }).WithOpenApi();

            selfGroup.MapPost("/2fa/enable", async (ToggleTwoFactorDto dto, UserManager<ApplicationUser> userManager, HttpContext httpContext) =>
            {
                var user = await GetCurrentUserAsync(userManager, httpContext);
                if (user is null)
                {
                    return ApiResults.Failure(
                        "SELF_NOT_FOUND",
                        "Unable to resolve the current user.",
                        httpContext,
                        StatusCodes.Status401Unauthorized);
                }

                var desiredState = dto.Enable ?? true;
                var result = await userManager.SetTwoFactorEnabledAsync(user, desiredState);
                if (!result.Succeeded)
                {
                    return ToIdentityFailure(result, httpContext, "SELF_2FA_UPDATE_FAILED", "Failed to update two-factor authentication state.", StatusCodes.Status400BadRequest);
                }

                return ApiResults.Ok(new TwoFactorStateDto(desiredState), httpContext);
            }).WithOpenApi();
        }

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

            usersGroup.MapGet("/{id}", async (string id, UserManager<ApplicationUser> userManager, HttpContext httpContext, CancellationToken ct) =>
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
                    // We need a tracked user instance to fetch roles
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

            adminGroup.MapPost("/", async (CreateUserDto dto, UserManager<ApplicationUser> userManager, HttpContext httpContext) =>
            {
                var user = new ApplicationUser
                {
                    UserName = dto.UserName.Trim(),
                    Email = dto.Email.Trim(),
                    DisplayName = NormalizeOrNull(dto.DisplayName),
                    AvatarUrl = NormalizeOrNull(dto.AvatarUrl),
                    CreatedAtUtc = DateTime.UtcNow,
                    EmailConfirmed = dto.EmailConfirmed ?? false
                };

                var result = await userManager.CreateAsync(user, dto.Password);
                if (!result.Succeeded)
                {
                    return ToIdentityFailure(result, httpContext, "USER_CREATE_FAILED", "Failed to create user.", StatusCodes.Status400BadRequest);
                }

                if (dto.Roles?.Any() == true)
                {
                    var rolesToAssign = dto.Roles.Where(r => !string.IsNullOrWhiteSpace(r)).Select(r => r.Trim());
                    var roleResult = await userManager.AddToRolesAsync(user, rolesToAssign);
                    if (!roleResult.Succeeded)
                    {
                        return ToIdentityFailure(roleResult, httpContext, "USER_ROLE_ASSIGN_FAILED", "User created but role assignment failed.", StatusCodes.Status400BadRequest);
                    }
                }

                var detail = await BuildAdminDetailAsync(userManager, user.Id);
                return ApiResults.Created($"/api/users/{user.Id}", detail, httpContext);
            }).WithOpenApi();

            adminGroup.MapPatch("/{id}", async (string id, AdminUpdateUserDto dto, UserManager<ApplicationUser> userManager, HttpContext httpContext) =>
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

                if (dto.DisplayName is not null)
                {
                    user.DisplayName = NormalizeOrNull(dto.DisplayName);
                }

                if (dto.AvatarUrl is not null)
                {
                    user.AvatarUrl = NormalizeOrNull(dto.AvatarUrl);
                }

                if (dto.Email is not null)
                {
                    user.Email = dto.Email.Trim();
                }

                if (dto.EmailConfirmed.HasValue)
                {
                    user.EmailConfirmed = dto.EmailConfirmed.Value;
                }

                if (dto.PhoneNumber is not null)
                {
                    user.PhoneNumber = NormalizeOrNull(dto.PhoneNumber);
                }

                if (dto.PhoneNumberConfirmed.HasValue)
                {
                    user.PhoneNumberConfirmed = dto.PhoneNumberConfirmed.Value;
                }

                if (dto.TwoFactorEnabled.HasValue)
                {
                    user.TwoFactorEnabled = dto.TwoFactorEnabled.Value;
                }

                var updateResult = await userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    return ToIdentityFailure(updateResult, httpContext, "USER_UPDATE_FAILED", "Failed to update user.", StatusCodes.Status400BadRequest);
                }

                if (dto.Roles is not null)
                {
                    var currentRoles = await userManager.GetRolesAsync(user);
                    var desiredRoles = dto.Roles.Where(r => !string.IsNullOrWhiteSpace(r)).Select(r => r.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

                    var rolesToRemove = currentRoles.Where(r => !desiredRoles.Contains(r, StringComparer.OrdinalIgnoreCase));
                    var rolesToAdd = desiredRoles.Where(r => !currentRoles.Contains(r, StringComparer.OrdinalIgnoreCase));

                    if (rolesToRemove.Any())
                    {
                        var removeResult = await userManager.RemoveFromRolesAsync(user, rolesToRemove);
                        if (!removeResult.Succeeded)
                        {
                            return ToIdentityFailure(removeResult, httpContext, "USER_ROLE_REMOVE_FAILED", "Failed to remove roles from user.", StatusCodes.Status400BadRequest);
                        }
                    }

                    if (rolesToAdd.Any())
                    {
                        var addResult = await userManager.AddToRolesAsync(user, rolesToAdd);
                        if (!addResult.Succeeded)
                        {
                            return ToIdentityFailure(addResult, httpContext, "USER_ROLE_ADD_FAILED", "Failed to add roles to user.", StatusCodes.Status400BadRequest);
                        }
                    }
                }

                var detail = await BuildAdminDetailAsync(userManager, user.Id);
                return ApiResults.Ok(detail, httpContext);
            }).WithOpenApi();

            adminGroup.MapPost("/{id}/lock", async (string id, LockUserRequestDto dto, UserManager<ApplicationUser> userManager, HttpContext httpContext) =>
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
                        return ToIdentityFailure(unlockResult, httpContext, "USER_UNLOCK_FAILED", "Failed to unlock user.", StatusCodes.Status400BadRequest);
                    }

                    return ApiResults.Ok(new UserLockResponseDto(user.Id, null), httpContext);
                }

                var until = dto.Until ?? DateTimeOffset.MaxValue;
                user.LockoutEnabled = true;

                var lockResult = await userManager.SetLockoutEndDateAsync(user, until);
                if (!lockResult.Succeeded)
                {
                    return ToIdentityFailure(lockResult, httpContext, "USER_LOCK_FAILED", "Failed to lock user.", StatusCodes.Status400BadRequest);
                }

                var updateResult = await userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    return ToIdentityFailure(updateResult, httpContext, "USER_LOCK_FAILED", "Failed to lock user.", StatusCodes.Status400BadRequest);
                }

                return ApiResults.Ok(new UserLockResponseDto(user.Id, until), httpContext);
            }).WithOpenApi();

            adminGroup.MapDelete("/{id}", async (string id, UserManager<ApplicationUser> userManager, HttpContext httpContext) =>
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
                    return ToIdentityFailure(lockResult, httpContext, "USER_SOFT_DELETE_FAILED", "Failed to delete user.", StatusCodes.Status400BadRequest);
                }

                var deleteResult = await userManager.UpdateAsync(user);
                if (!deleteResult.Succeeded)
                {
                    return ToIdentityFailure(deleteResult, httpContext, "USER_SOFT_DELETE_FAILED", "Failed to delete user.", StatusCodes.Status400BadRequest);
                }

                return ApiResults.Ok(new UserDeleteResponseDto(user.Id, user.IsDeleted), httpContext);
            }).WithOpenApi();
        }

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

            return (key switch
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
            });
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

        private static string? NormalizeOrNull(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            var trimmed = value.Trim();
            return string.IsNullOrEmpty(trimmed) ? null : trimmed;
        }

        private static Task<ApplicationUser?> GetCurrentUserAsync(UserManager<ApplicationUser> userManager, HttpContext httpContext)
            => userManager.GetUserAsync(httpContext.User);

        private static IResult ToIdentityFailure(IdentityResult result, HttpContext httpContext, string code, string message, int statusCode)
        {
            var details = result.Errors
                .GroupBy(error => error.Code)
                .ToDictionary(group => group.Key, group => group.Select(error => error.Description).ToArray());

            return ApiResults.Failure(code, message, httpContext, statusCode, details);
        }

        private static SelfProfileDto ToSelfProfile(ApplicationUser user) => new(
            user.Id,
            user.UserName,
            user.DisplayName,
            user.Email,
            user.EmailConfirmed,
            user.PhoneNumber,
            user.PhoneNumberConfirmed,
            user.AvatarUrl,
            user.CreatedAtUtc,
            user.TwoFactorEnabled);

        private record SelfProfileDto(
            string Id,
            string? UserName,
            string? DisplayName,
            string? Email,
            bool EmailConfirmed,
            string? PhoneNumber,
            bool PhoneNumberConfirmed,
            string? AvatarUrl,
            DateTime CreatedAtUtc,
            bool TwoFactorEnabled);

        private record UpdateSelfProfileDto(string? DisplayName, string? AvatarUrl, string? PhoneNumber);

        private record UpdateAvatarDto(string? AvatarUrl);

        private record AvatarUpdatedDto(string? AvatarUrl);

        private record SelfSecurityDto(
            string? Email,
            bool EmailConfirmed,
            string? PhoneNumber,
            bool PhoneNumberConfirmed,
            bool TwoFactorEnabled,
            DateTimeOffset? LockoutEnd,
            IReadOnlyCollection<string> Roles);

        private record ToggleTwoFactorDto(bool? Enable);

        private record TwoFactorStateDto(bool Enabled);

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

        private sealed record CreateUserDto
        {
            public required string UserName { get; init; }
            public required string Email { get; init; }
            public required string Password { get; init; }
            public string? DisplayName { get; init; }
            public string? AvatarUrl { get; init; }
            public bool? EmailConfirmed { get; init; }
            public IEnumerable<string>? Roles { get; init; }
        }

        private sealed record AdminUpdateUserDto
        {
            public string? DisplayName { get; init; }
            public string? AvatarUrl { get; init; }
            public string? Email { get; init; }
            public bool? EmailConfirmed { get; init; }
            public string? PhoneNumber { get; init; }
            public bool? PhoneNumberConfirmed { get; init; }
            public bool? TwoFactorEnabled { get; init; }
            public IEnumerable<string>? Roles { get; init; }
        }

        private sealed record LockUserRequestDto
        {
            public DateTimeOffset? Until { get; init; }
            public bool? Unlock { get; init; }
        }

        private record UserLockResponseDto(string UserId, DateTimeOffset? LockoutEnd);

        private record UserDeleteResponseDto(string UserId, bool IsDeleted);
    }
}
