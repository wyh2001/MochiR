using Microsoft.EntityFrameworkCore;
using MochiR.Api.Dtos;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using MochiR.Api.Infrastructure.Validation;

namespace MochiR.Api.Endpoints
{
    public static partial class CriteriaTemplatesEndpoints
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
            })
            .Produces<ApiResponse<IReadOnlyList<CriteriaTemplateSummaryDto>>>(StatusCodes.Status200OK)
            .WithSummary("List criteria templates.")
            .WithDescription("GET /api/criteria-templates. Optional query parameter subjectTypeId filters templates for a specific type. Returns 200 with template summaries ordered by id.")
            .WithOpenApi();

            group.MapPost("/", async (CreateCriteriaTemplateDto dto, ApplicationDbContext db, HttpContext httpContext, CancellationToken cancellationToken) =>
            {
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
            })
            .Produces<ApiResponse<CriteriaTemplateSummaryDto>>(StatusCodes.Status201Created)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict)
            .WithSummary("Create a criteria template.")
            .WithDescription("POST /api/criteria-templates. Requires admin authorization. Accepts subjectTypeId, key, displayName, and isRequired. Returns 201 with the created template summary, or 400/409 when validation fails.")
            .AddValidation<CreateCriteriaTemplateDto>(
                "CRITERIA_TEMPLATE_INVALID_INPUT",
                "Key and display name are required.")
            .RequireAuthorization(policy => policy.RequireRole(AppRoles.Admin)).WithOpenApi();

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
            })
            .Produces<ApiResponse<CriteriaTemplateDetailDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status404NotFound)
            .WithSummary("Get criteria template details.")
            .WithDescription("GET /api/criteria-templates/{id}. Returns 200 with template metadata and its subject type information, or 404 when the template is not found.")
            .WithOpenApi();
        }

        internal record CreateCriteriaTemplateDto(int SubjectTypeId, string Key, string DisplayName, bool IsRequired);
        private record CriteriaTemplateSummaryDto(int Id, int SubjectTypeId, string Key, string DisplayName, bool IsRequired);
        private record CriteriaTemplateDetailDto(int Id, int SubjectTypeId, string? SubjectTypeKey, string? SubjectTypeDisplayName, string Key, string DisplayName, bool IsRequired);
    }
}
