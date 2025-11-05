using Microsoft.EntityFrameworkCore;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using MochiR.Api.Infrastructure.Validation;

namespace MochiR.Api.Endpoints
{
    public static partial class SubjectsEndpoints
    {
        public static void MapSubjectsEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/subjects").WithTags("Subjects");

            group.MapGet("/", async (ApplicationDbContext db, HttpContext httpContext, CancellationToken ct) =>
            {
                var subjects = await db.Subjects
                    .AsNoTracking()
                    .Where(s => !s.IsDeleted)
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
            })
            .AddValidation<CreateSubjectDto>(
                "SUBJECT_INVALID_INPUT",
                "Name and Slug are required.")
            .RequireAuthorization(policy => policy.RequireRole(AppRoles.Admin)).WithOpenApi();

            group.MapGet("/{id:int}", async (int id, ApplicationDbContext db, HttpContext httpContext, CancellationToken cancellationToken) =>
            {
                var subject = await db.Subjects
                    .AsNoTracking()
                    .Include(s => s.SubjectType)
                    .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

                if (subject is null || subject.IsDeleted)
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

            group.MapPut("/{id:int}", async (int id, UpdateSubjectDto dto, ApplicationDbContext db, HttpContext httpContext, CancellationToken ct) =>
            {
                var subject = await db.Subjects
                    .Include(s => s.Attributes)
                    .FirstOrDefaultAsync(s => s.Id == id, ct);

                if (subject is null || subject.IsDeleted)
                {
                    return ApiResults.Failure(
                        "SUBJECT_NOT_FOUND",
                        "Subject not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
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

                var slugInUse = await db.Subjects
                    .Where(s => s.Id != id)
                    .AnyAsync(s => s.Slug == normalizedSlug, ct);
                if (slugInUse)
                {
                    return ApiResults.Failure(
                        "SUBJECT_DUPLICATE_SLUG",
                        "Subject slug already exists.",
                        httpContext,
                        StatusCodes.Status409Conflict);
                }

                subject.Name = normalizedName;
                subject.Slug = normalizedSlug;
                subject.SubjectTypeId = dto.SubjectTypeId;
                subject.Attributes = dto.Attributes?.Select(a => new SubjectAttribute
                {
                    Key = a.Key,
                    Value = a.Value,
                    Note = a.Note
                })?.ToList() ?? new List<SubjectAttribute>();

                await db.SaveChangesAsync(ct);

                var payload = new SubjectSummaryDto(subject.Id, subject.Name, subject.Slug, subject.SubjectTypeId);
                return ApiResults.Ok(payload, httpContext);
            })
            .AddValidation<UpdateSubjectDto>(
                "SUBJECT_INVALID_INPUT",
                "Name and Slug are required.")
            .RequireAuthorization(policy => policy.RequireRole(AppRoles.Admin)).WithOpenApi();

            group.MapDelete("/{id:int}", async (int id, ApplicationDbContext db, HttpContext httpContext, CancellationToken ct) =>
            {
                var subject = await db.Subjects.FirstOrDefaultAsync(s => s.Id == id, ct);
                if (subject is null || subject.IsDeleted)
                {
                    return ApiResults.Failure(
                        "SUBJECT_NOT_FOUND",
                        "Subject not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                subject.IsDeleted = true;

                var reviews = await db.Reviews
                    .Where(r => r.SubjectId == id && !r.IsDeleted)
                    .ToListAsync(ct);

                foreach (var review in reviews)
                {
                    review.IsDeleted = true;
                    review.Status = ReviewStatus.Pending;
                    review.UpdatedAt = DateTime.UtcNow;
                }

                var aggregate = await db.Aggregates.FirstOrDefaultAsync(a => a.SubjectId == id, ct);
                if (aggregate is not null)
                {
                    db.Aggregates.Remove(aggregate);
                }

                await db.SaveChangesAsync(ct);

                return ApiResults.Ok(new SubjectDeleteResultDto(id, true), httpContext);
            }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Admin)).WithOpenApi();
        }

        internal record SubjectAttributeDto(string Key, string? Value, string? Note);
        internal record CreateSubjectDto(string Name, string Slug, int SubjectTypeId, IReadOnlyList<SubjectAttributeDto>? Attributes);
        internal record UpdateSubjectDto(string Name, string Slug, int SubjectTypeId, IReadOnlyList<SubjectAttributeDto>? Attributes);
        private record SubjectSummaryDto(int Id, string Name, string Slug, int SubjectTypeId);
        private record SubjectDetailDto(int Id, string Name, string Slug, int SubjectTypeId, string? SubjectTypeKey, string? SubjectTypeDisplayName, IReadOnlyList<SubjectAttributeDto> Attributes, DateTime CreatedAt);
        private record SubjectDeleteResultDto(int Id, bool Deleted);
    }
}
