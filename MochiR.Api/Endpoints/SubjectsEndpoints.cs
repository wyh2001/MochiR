using Microsoft.EntityFrameworkCore;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Api.Endpoints
{
    public static class SubjectsEndpoints
    {
        public static void MapSubjectsEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/subjects").WithTags("Subjects");

            group.MapGet("/", async (ApplicationDbContext db, HttpContext httpContext, CancellationToken ct) =>
            {
                var subjects = await db.Subjects
                    .AsNoTracking()
                    .OrderBy(s => s.Id)
                    .Select(s => new SubjectSummaryDto(
                        s.Id,
                        s.Name,
                        s.Slug,
                        s.SubjectTypeId))
                    .ToListAsync(ct);

                return ApiResults.Ok(subjects, httpContext);
            }).WithOpenApi();

            group.MapPost("/", async (CreateSubjectDto dto, ApplicationDbContext db, HttpContext httpContext, CancellationToken ct) =>
            {
                if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Slug))
                {
                    return ApiResults.Failure(
                        "SUBJECT_INVALID_INPUT",
                        "Name and Slug are required.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                var subjectTypeExists = await db.SubjectTypes.AnyAsync(st => st.Id == dto.SubjectTypeId, ct);
                if (!subjectTypeExists)
                {
                    return ApiResults.Failure(
                        "SUBJECT_TYPE_NOT_FOUND",
                        "Subject type does not exist.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                var normalizedName = dto.Name.Trim();
                var normalizedSlug = dto.Slug.Trim();

                var slugExists = await db.Subjects.AnyAsync(s => s.Slug == normalizedSlug, ct);
                if (slugExists)
                {
                    return ApiResults.Failure(
                        "SUBJECT_DUPLICATE_SLUG",
                        "Subject slug already exists.",
                        httpContext,
                        StatusCodes.Status409Conflict);
                }

                var subject = new Subject
                {
                    Name = normalizedName,
                    Slug = normalizedSlug,
                    SubjectTypeId = dto.SubjectTypeId,
                    Attributes = dto.Attributes?.Select(a => new SubjectAttribute
                    {
                        Key = a.Key,
                        Value = a.Value,
                        Note = a.Note
                    })?.ToList() ?? new List<SubjectAttribute>()
                };

                db.Subjects.Add(subject);
                await db.SaveChangesAsync(ct);

                var payload = new SubjectSummaryDto(subject.Id, subject.Name, subject.Slug, subject.SubjectTypeId);
                return ApiResults.Created($"/api/subjects/{subject.Id}", payload, httpContext);
            }).WithOpenApi();

            group.MapGet("/{id:int}", async (int id, ApplicationDbContext db, HttpContext httpContext, CancellationToken cancellationToken) =>
            {
                var subject = await db.Subjects
                    .AsNoTracking()
                    .Include(s => s.SubjectType)
                    .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

                if (subject is null)
                {
                    return ApiResults.Failure(
                        "SUBJECT_NOT_FOUND",
                        "Subject not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                var payload = new SubjectDetailDto(
                    subject.Id,
                    subject.Name,
                    subject.Slug,
                    subject.SubjectTypeId,
                    subject.SubjectType?.Key,
                    subject.SubjectType?.DisplayName,
                    subject.Attributes.Select(a => new SubjectAttributeDto(a.Key, a.Value, a.Note)).ToList(),
                    subject.CreatedAt);

                return ApiResults.Ok(payload, httpContext);
            }).WithOpenApi();
        }

        private record SubjectAttributeDto(string Key, string? Value, string? Note);
        private record CreateSubjectDto(string Name, string Slug, int SubjectTypeId, IReadOnlyList<SubjectAttributeDto>? Attributes);
        private record SubjectSummaryDto(int Id, string Name, string Slug, int SubjectTypeId);
        private record SubjectDetailDto(int Id, string Name, string Slug, int SubjectTypeId, string? SubjectTypeKey, string? SubjectTypeDisplayName, IReadOnlyList<SubjectAttributeDto> Attributes, DateTime CreatedAt);
    }
}
