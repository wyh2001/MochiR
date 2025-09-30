using Microsoft.EntityFrameworkCore;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using System.Text.Json;

namespace MochiR.Api.Endpoints
{
    public static class SubjectsEndpoints
    {
        public static void MapSubjectsEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/subjects").WithTags("Subjects");

            group.MapGet("/", async (ApplicationDbContext db, CancellationToken ct) =>
            {
                return await db.Subjects
                    .AsNoTracking()
                    .OrderBy(s => s.Id)
                    .Select(s => new SubjectSummaryDto(
                        s.Id,
                        s.Name,
                        s.Slug,
                        s.SubjectTypeId))
                    .ToListAsync(ct);
            }).WithOpenApi();

            group.MapPost("/", async (CreateSubjectDto dto, ApplicationDbContext db, CancellationToken ct) =>
            {
                if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Slug))
                {
                    return Results.BadRequest(new { message = "Name and Slug are required." });
                }

                var subjectTypeExists = await db.SubjectTypes.AnyAsync(st => st.Id == dto.SubjectTypeId, ct);
                if (!subjectTypeExists)
                {
                    return Results.BadRequest(new { message = "Subject type does not exist." });
                }

                var normalizedName = dto.Name.Trim();
                var normalizedSlug = dto.Slug.Trim();

                var slugExists = await db.Subjects.AnyAsync(s => s.Slug == normalizedSlug, ct);
                if (slugExists)
                {
                    return Results.Conflict(new { message = "Subject slug already exists." });
                }

                var subject = new Subject
                {
                    Name = normalizedName,
                    Slug = normalizedSlug,
                    SubjectTypeId = dto.SubjectTypeId,
                    Extra = dto.Extra
                };

                db.Subjects.Add(subject);
                await db.SaveChangesAsync(ct);

                return Results.Created($"/api/subjects/{subject.Id}", new SubjectSummaryDto(subject.Id, subject.Name, subject.Slug, subject.SubjectTypeId));
            }).WithOpenApi();

            group.MapGet("/{id:int}", async (int id, ApplicationDbContext db, CancellationToken cancellationToken) =>
            {
                var subject = await db.Subjects
                    .AsNoTracking()
                    .Include(s => s.SubjectType)
                    .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

                if (subject is null)
                {
                    return Results.NotFound();
                }

                JsonElement? extra = subject.Extra?.RootElement.Clone();

                return Results.Ok(new SubjectDetailDto(
                    subject.Id,
                    subject.Name,
                    subject.Slug,
                    subject.SubjectTypeId,
                    subject.SubjectType?.Key,
                    subject.SubjectType?.DisplayName,
                    extra,
                    subject.CreatedAt));
            }).WithOpenApi();
        }

        private record CreateSubjectDto(string Name, string Slug, int SubjectTypeId, JsonDocument? Extra);
        private record SubjectSummaryDto(int Id, string Name, string Slug, int SubjectTypeId);
        private record SubjectDetailDto(int Id, string Name, string Slug, int SubjectTypeId, string? SubjectTypeKey, string? SubjectTypeDisplayName, JsonElement? Extra, DateTime CreatedAt);
    }
}
