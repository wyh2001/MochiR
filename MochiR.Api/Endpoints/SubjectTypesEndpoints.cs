using Microsoft.EntityFrameworkCore;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Api.Endpoints
{
    public static class SubjectTypesEndpoints
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
                if (string.IsNullOrWhiteSpace(dto.Key) || string.IsNullOrWhiteSpace(dto.DisplayName))
                {
                    return ApiResults.Failure(
                        "SUBJECT_TYPE_INVALID_INPUT",
                        "Key and DisplayName are required.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

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
            }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Admin)).WithOpenApi();
        }

        private record SubjectTypeSettingDto(string Key, string? Value, string? Note);
        private record CreateSubjectTypeDto(string Key, string DisplayName, IReadOnlyList<SubjectTypeSettingDto>? Settings);
        private record SubjectTypeSummaryDto(int Id, string Key, string DisplayName);
    }
}
