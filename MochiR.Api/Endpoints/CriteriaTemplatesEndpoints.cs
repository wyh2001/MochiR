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

            group.MapGet("/", async (int? subjectTypeId, ApplicationDbContext db, HttpContext httpContext, CancellationToken cancellationToken) =>
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

                var templates = await query.ToListAsync(cancellationToken);
                return ApiResults.Ok(templates, httpContext);
            }).WithOpenApi();

            group.MapPost("/", async (CreateCriteriaTemplateDto dto, ApplicationDbContext db, HttpContext httpContext, CancellationToken cancellationToken) =>
            {
                if (string.IsNullOrWhiteSpace(dto.Key) || string.IsNullOrWhiteSpace(dto.DisplayName))
                {
                    return ApiResults.Failure(
                        "CRITERIA_TEMPLATE_INVALID_INPUT",
                        "Key and DisplayName are required.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                var subjectTypeExists = await db.SubjectTypes.AnyAsync(st => st.Id == dto.SubjectTypeId, cancellationToken);
                if (!subjectTypeExists)
                {
                    return ApiResults.Failure(
                        "CRITERIA_TEMPLATE_SUBJECT_TYPE_NOT_FOUND",
                        "Subject type does not exist.",
                        httpContext,
                        StatusCodes.Status400BadRequest);
                }

                var normalizedKey = dto.Key.Trim();
                var normalizedDisplayName = dto.DisplayName.Trim();

                var duplicate = await db.CriteriaTemplates
                    .AnyAsync(template => template.SubjectTypeId == dto.SubjectTypeId && template.Key == normalizedKey, cancellationToken);

                if (duplicate)
                {
                    return ApiResults.Failure(
                        "CRITERIA_TEMPLATE_DUPLICATE_KEY",
                        "Criteria template key already exists for this subject type.",
                        httpContext,
                        StatusCodes.Status409Conflict);
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

                var payload = new CriteriaTemplateSummaryDto(template.Id, template.SubjectTypeId, template.Key, template.DisplayName, template.IsRequired);

                return ApiResults.Created(
                    $"/api/criteria-templates/{template.Id}",
                    payload,
                    httpContext);
            }).WithOpenApi();

            group.MapGet("/{id:int}", async (int id, ApplicationDbContext db, HttpContext httpContext, CancellationToken cancellationToken) =>
            {
                var template = await db.CriteriaTemplates
                    .AsNoTracking()
                    .Include(t => t.SubjectType)
                    .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

                if (template is null)
                {
                    return ApiResults.Failure(
                        "CRITERIA_TEMPLATE_NOT_FOUND",
                        "Criteria template not found.",
                        httpContext,
                        StatusCodes.Status404NotFound);
                }

                var payload = new CriteriaTemplateDetailDto(
                    template.Id,
                    template.SubjectTypeId,
                    template.SubjectType?.Key,
                    template.SubjectType?.DisplayName,
                    template.Key,
                    template.DisplayName,
                    template.IsRequired);

                return ApiResults.Ok(payload, httpContext);
            }).WithOpenApi();
        }

        private record CreateCriteriaTemplateDto(int SubjectTypeId, string Key, string DisplayName, bool IsRequired);
        private record CriteriaTemplateSummaryDto(int Id, int SubjectTypeId, string Key, string DisplayName, bool IsRequired);
        private record CriteriaTemplateDetailDto(int Id, int SubjectTypeId, string? SubjectTypeKey, string? SubjectTypeDisplayName, string Key, string DisplayName, bool IsRequired);
    }
}
