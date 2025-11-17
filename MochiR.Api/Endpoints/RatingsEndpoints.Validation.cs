using FluentValidation;

namespace MochiR.Api.Endpoints
{
    public static partial class RatingsEndpoints
    {
        internal sealed class UpsertAggregateDtoValidator : AbstractValidator<UpsertAggregateDto>
        {
            public UpsertAggregateDtoValidator()
            {
                RuleFor(dto => dto.CountReviews)
                    .GreaterThanOrEqualTo(0)
                    .WithMessage("CountReviews cannot be negative.")
                    .WithErrorCode("RATINGS_INVALID_COUNT");

                RuleFor(dto => dto.AvgOverall)
                    .InclusiveBetween(0, 5)
                    .WithMessage("AvgOverall must be between 0 and 5.")
                    .WithErrorCode("RATINGS_INVALID_AVERAGE");

                RuleForEach(dto => dto.Metrics)
                    .SetValidator(new AggregateMetricDtoValidator());
            }
        }

        internal sealed class AggregateMetricDtoValidator : AbstractValidator<AggregateMetricDto>
        {
            public AggregateMetricDtoValidator()
            {
                RuleFor(dto => dto.Key)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .Must(BeNonWhitespace)
                    .WithMessage("Metric key is required.");

                RuleFor(dto => dto.Value)
                    .GreaterThanOrEqualTo(0)
                    .When(dto => dto.Value.HasValue);

                RuleFor(dto => dto.Count)
                    .GreaterThanOrEqualTo(0)
                    .When(dto => dto.Count.HasValue);
            }
        }

        private static bool BeNonWhitespace(string? value) => !string.IsNullOrWhiteSpace(value);
    }
}
