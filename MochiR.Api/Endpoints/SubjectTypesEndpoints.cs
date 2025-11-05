using Microsoft.EntityFrameworkCore;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using MochiR.Api.Infrastructure.Validation;

namespace MochiR.Api.Endpoints
{
    public static partial class SubjectTypesEndpoints
    {
        public static void MapSubjectTypesEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/subject-types").WithTags("SubjectTypes");

            group.MapGet("/", async (ApplicationDbContext db, HttpContext httpContext, CancellationToken ct) =>
            {
                var subjectTypes = await db.SubjectTypes
                    .AsNoTracking()
                    .OrderBy(st => st.Id)
                    .Select(st => new SubjectTypeSummaryDto(st.Id, st.Key, st.DisplayName))
                    .ToListAsync(ct);

                return ApiResults.Ok(subjectTypes, httpContext);
            }).WithOpenApi();

            group.MapPost("/", async (CreateSubjectTypeDto dto, ApplicationDbContext db, HttpContext httpContext, CancellationToken ct) =>
            {
                var normalizedKey = dto.Key.Trim();
                var normalizedDisplayName = dto.DisplayName.Trim();

                var exists = await db.SubjectTypes
                    .AnyAsync(st => st.Key == normalizedKey, ct);

                if (exists)
                {
                    return ApiResults.Failure(
                        "SUBJECT_TYPE_DUPLICATE_KEY",
                        "Subject type key already exists.",
                        httpContext,
                        StatusCodes.Status409Conflict);
                }

                var subjectType = new SubjectType
                {
                    Key = normalizedKey,
                    DisplayName = normalizedDisplayName,
                    Settings = dto.Settings?.Select(s => new SubjectTypeSetting
                    {
                        Key = s.Key,
                        Value = s.Value,
                        Note = s.Note
                    })?.ToList() ?? new List<SubjectTypeSetting>()
                };

                db.SubjectTypes.Add(subjectType);
                await db.SaveChangesAsync(ct);

                var payload = new SubjectTypeSummaryDto(subjectType.Id, subjectType.Key, subjectType.DisplayName);
                return ApiResults.Created($"/api/subject-types/{subjectType.Id}", payload, httpContext);
            })
            .AddValidation<CreateSubjectTypeDto>(
                "SUBJECT_TYPE_INVALID_INPUT",
                "Key and display name are required.")
            .RequireAuthorization(policy => policy.RequireRole(AppRoles.Admin)).WithOpenApi();

            group.MapPut("/{id:int}", async (int id, UpdateSubjectTypeDto dto, ApplicationDbContext db, HttpContext httpContext, CancellationToken ct) =>
            {
                var subjectType = await db.SubjectTypes
                    .Include(st => st.Settings)
                    .FirstOrDefaultAsync(st => st.Id == id, ct);

                if (subjectType is null)
                {
                    return ApiResults.Failure(
                        "SUBJECT_TYPE_NOT_FOUND",
                        "Subject type not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                var normalizedKey = dto.Key.Trim();
                var normalizedDisplayName = dto.DisplayName.Trim();

                var keyExists = await db.SubjectTypes
                    .AnyAsync(st => st.Id != id && st.Key == normalizedKey, ct);

                if (keyExists)
                {
                    return ApiResults.Failure(
                        "SUBJECT_TYPE_DUPLICATE_KEY",
                        "Subject type key already exists.",
                        httpContext,
                        StatusCodes.Status409Conflict);
                }

                subjectType.Key = normalizedKey;
                subjectType.DisplayName = normalizedDisplayName;
                subjectType.Settings = dto.Settings?.Select(s => new SubjectTypeSetting
                {
                    Key = s.Key,
                    Value = s.Value,
                    Note = s.Note
                })?.ToList() ?? new List<SubjectTypeSetting>();

                await db.SaveChangesAsync(ct);

                var payload = new SubjectTypeSummaryDto(subjectType.Id, subjectType.Key, subjectType.DisplayName);
                return ApiResults.Ok(payload, httpContext);
            })
            .AddValidation<UpdateSubjectTypeDto>(
                "SUBJECT_TYPE_INVALID_INPUT",
                "Key and display name are required.")
            .RequireAuthorization(policy => policy.RequireRole(AppRoles.Admin)).WithOpenApi();

            group.MapDelete("/{id:int}", async (int id, ApplicationDbContext db, HttpContext httpContext, CancellationToken ct) =>
            {
                var subjectType = await db.SubjectTypes.FirstOrDefaultAsync(st => st.Id == id, ct);

                if (subjectType is null)
                {
                    return ApiResults.Failure(
                        "SUBJECT_TYPE_NOT_FOUND",
                        "Subject type not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                var inUse = await db.Subjects.AnyAsync(s => s.SubjectTypeId == id, ct);

                if (inUse)
                {
                    return ApiResults.Failure(
                        "SUBJECT_TYPE_IN_USE",
                        "Subject type is referenced by existing subjects.",
                        httpContext,
                        StatusCodes.Status409Conflict);
                }

                db.SubjectTypes.Remove(subjectType);
                await db.SaveChangesAsync(ct);

                return ApiResults.Ok(new SubjectTypeDeleteResultDto(id, true), httpContext);
            }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Admin)).WithOpenApi();
        }

        internal record SubjectTypeSettingDto(string Key, string? Value, string? Note);
        internal record CreateSubjectTypeDto(string Key, string DisplayName, IReadOnlyList<SubjectTypeSettingDto>? Settings);
        internal record UpdateSubjectTypeDto(string Key, string DisplayName, IReadOnlyList<SubjectTypeSettingDto>? Settings);
        private record SubjectTypeSummaryDto(int Id, string Key, string DisplayName);
        private record SubjectTypeDeleteResultDto(int Id, bool Deleted);
    }
}
