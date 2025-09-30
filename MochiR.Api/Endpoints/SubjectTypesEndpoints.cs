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

            group.MapGet("/", async (ApplicationDbContext db, CancellationToken ct) =>
            {
                return await db.SubjectTypes
                    .AsNoTracking()
                    .OrderBy(st => st.Id)
                    .Select(st => new SubjectTypeSummaryDto(st.Id, st.Key, st.DisplayName))
                    .ToListAsync(ct);
            }).WithOpenApi();

            group.MapPost("/", async (CreateSubjectTypeDto dto, ApplicationDbContext db, CancellationToken ct) =>
            {
                if (string.IsNullOrWhiteSpace(dto.Key) || string.IsNullOrWhiteSpace(dto.DisplayName))
                {
                    return Results.BadRequest(new { message = "Key and DisplayName are required." });
                }

                var normalizedKey = dto.Key.Trim();
                var normalizedDisplayName = dto.DisplayName.Trim();

                var exists = await db.SubjectTypes
                    .AnyAsync(st => st.Key == normalizedKey, ct);

                if (exists)
                {
                    return Results.Conflict(new { message = "Subject type key already exists." });
                }

                var subjectType = new SubjectType
                {
                    Key = normalizedKey,
                    DisplayName = normalizedDisplayName
                };

                db.SubjectTypes.Add(subjectType);
                await db.SaveChangesAsync(ct);

                return Results.Created($"/api/subject-types/{subjectType.Id}", new SubjectTypeSummaryDto(subjectType.Id, subjectType.Key, subjectType.DisplayName));
            }).WithOpenApi();
        }

        private record CreateSubjectTypeDto(string Key, string DisplayName);
        private record SubjectTypeSummaryDto(int Id, string Key, string DisplayName);
    }
}
