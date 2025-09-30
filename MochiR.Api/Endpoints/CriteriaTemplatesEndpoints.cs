using Microsoft.EntityFrameworkCore;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Api.Endpoints
{
    public static class CriteriaTemplatesEndpoints
    {
        public static void MapCriteriaTemplatesEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/criteria-templates").WithTags("CriteriaTemplates");

            group.MapGet("/", async (int? subjectTypeId, ApplicationDbContext db, CancellationToken cancellationToken) =>
            {
                var query = db.CriteriaTemplates
                    .AsNoTracking()
                    .OrderBy(template => template.Id)
                    .Select(template => new CriteriaTemplateSummaryDto(
                        template.Id,
                        template.SubjectTypeId,
                        template.Key,
                        template.DisplayName,
                        template.IsRequired));

                if (subjectTypeId.HasValue)
                {
                    query = query.Where(template => template.SubjectTypeId == subjectTypeId.Value);
                }

                return await query.ToListAsync(cancellationToken);
            }).WithOpenApi();

            group.MapPost("/", async (CreateCriteriaTemplateDto dto, ApplicationDbContext db, CancellationToken cancellationToken) =>
            {
                if (string.IsNullOrWhiteSpace(dto.Key) || string.IsNullOrWhiteSpace(dto.DisplayName))
                {
                    return Results.BadRequest(new { message = "Key and DisplayName are required." });
                }

                var subjectTypeExists = await db.SubjectTypes.AnyAsync(st => st.Id == dto.SubjectTypeId, cancellationToken);
                if (!subjectTypeExists)
                {
                    return Results.BadRequest(new { message = "Subject type does not exist." });
                }

                var normalizedKey = dto.Key.Trim();
                var normalizedDisplayName = dto.DisplayName.Trim();

                var duplicate = await db.CriteriaTemplates
                    .AnyAsync(template => template.SubjectTypeId == dto.SubjectTypeId && template.Key == normalizedKey, cancellationToken);

                if (duplicate)
                {
                    return Results.Conflict(new { message = "Criteria template key already exists for this subject type." });
                }

                var template = new CriteriaTemplate
                {
                    SubjectTypeId = dto.SubjectTypeId,
                    Key = normalizedKey,
                    DisplayName = normalizedDisplayName,
                    IsRequired = dto.IsRequired
                };

                db.CriteriaTemplates.Add(template);
                await db.SaveChangesAsync(cancellationToken);

                return Results.Created(
                    $"/api/criteria-templates/{template.Id}",
                    new CriteriaTemplateSummaryDto(template.Id, template.SubjectTypeId, template.Key, template.DisplayName, template.IsRequired));
            }).WithOpenApi();

            group.MapGet("/{id:int}", async (int id, ApplicationDbContext db, CancellationToken cancellationToken) =>
            {
                var template = await db.CriteriaTemplates
                    .AsNoTracking()
                    .Include(t => t.SubjectType)
                    .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

                if (template is null)
                {
                    return Results.NotFound();
                }

                return Results.Ok(new CriteriaTemplateDetailDto(
                    template.Id,
                    template.SubjectTypeId,
                    template.SubjectType?.Key,
                    template.SubjectType?.DisplayName,
                    template.Key,
                    template.DisplayName,
                    template.IsRequired));
            }).WithOpenApi();
        }

        private record CreateCriteriaTemplateDto(int SubjectTypeId, string Key, string DisplayName, bool IsRequired);
        private record CriteriaTemplateSummaryDto(int Id, int SubjectTypeId, string Key, string DisplayName, bool IsRequired);
        private record CriteriaTemplateDetailDto(int Id, int SubjectTypeId, string? SubjectTypeKey, string? SubjectTypeDisplayName, string Key, string DisplayName, bool IsRequired);
    }
}
