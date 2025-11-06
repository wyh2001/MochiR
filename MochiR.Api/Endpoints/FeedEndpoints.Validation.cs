using FluentValidation;

namespace MochiR.Api.Endpoints
{
    public static partial class FeedEndpoints
    {
        internal sealed class FeedQueryDtoValidator : AbstractValidator<FeedQueryDto>
        {
            public FeedQueryDtoValidator()
            {
                RuleFor(q => q.Page)
                    .GreaterThan(0)
                    .When(q => q.Page.HasValue)
                    .WithMessage("Page must be greater than zero.")
                    .WithErrorCode("FEED_INVALID_QUERY");

                RuleFor(q => q.PageSize)
                    .GreaterThan(0)
                    .When(q => q.PageSize.HasValue)
                    .WithMessage("PageSize must be greater than zero.")
                    .WithErrorCode("FEED_INVALID_QUERY");

                RuleFor(q => q.PageSize)
                    .LessThanOrEqualTo(MaxPageSize)
                    .When(q => q.PageSize.HasValue)
                    .WithMessage($"PageSize cannot exceed {MaxPageSize}.")
                    .WithErrorCode("FEED_INVALID_QUERY");

                RuleFor(q => q.AfterId)
                    .GreaterThan(0)
                    .When(q => q.AfterId.HasValue)
                    .WithMessage("AfterId must be greater than zero.")
                    .WithErrorCode("FEED_INVALID_QUERY");
            }
        }
    }
}
