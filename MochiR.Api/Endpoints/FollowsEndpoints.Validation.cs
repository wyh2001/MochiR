using FluentValidation;

namespace MochiR.Api.Endpoints
{
    public static partial class FollowsEndpoints
    {
        internal sealed class FollowListQueryDtoValidator : AbstractValidator<FollowListQueryDto>
        {
            public FollowListQueryDtoValidator()
            {
                RuleFor(dto => dto.Page)
                    .GreaterThan(0)
                    .When(dto => dto.Page.HasValue)
                    .WithMessage("Page must be greater than zero.")
                    .WithErrorCode("FOLLOW_INVALID_QUERY");

                RuleFor(dto => dto.PageSize)
                    .GreaterThan(0)
                    .When(dto => dto.PageSize.HasValue)
                    .WithMessage("PageSize must be greater than zero.")
                    .WithErrorCode("FOLLOW_INVALID_QUERY");

                RuleFor(dto => dto.PageSize)
                    .LessThanOrEqualTo(MaxPageSize)
                    .When(dto => dto.PageSize.HasValue)
                    .WithMessage($"PageSize cannot exceed {MaxPageSize}.")
                    .WithErrorCode("FOLLOW_INVALID_QUERY");
            }
        }
    }
}
