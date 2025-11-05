using FluentValidation;

namespace MochiR.Api.Endpoints
{
    public static partial class ReviewsEndpoints
    {
        internal sealed class CreateReviewDtoValidator : AbstractValidator<CreateReviewDto>
        {
            public CreateReviewDtoValidator()
            {
                RuleFor(dto => dto.SubjectId)
                    .GreaterThan(0)
                    .WithMessage("SubjectId is required.")
                    .WithErrorCode("REVIEW_INVALID_INPUT");

                RuleFor(dto => dto.Title)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Title is required.")
                    .WithErrorCode("REVIEW_INVALID_INPUT")
                    .Must(BeNonWhitespace)
                    .WithMessage("Title is required.")
                    .WithErrorCode("REVIEW_INVALID_INPUT");

                RuleForEach(dto => dto.Ratings)
                    .SetValidator(new ReviewRatingDtoValidator());
            }
        }

        internal sealed class UpdateReviewDtoValidator : AbstractValidator<UpdateReviewDto>
        {
            public UpdateReviewDtoValidator()
            {
                RuleFor(dto => dto.Title)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Title is required.")
                    .WithErrorCode("REVIEW_INVALID_INPUT")
                    .Must(BeNonWhitespace)
                    .WithMessage("Title is required.")
                    .WithErrorCode("REVIEW_INVALID_INPUT");

                RuleForEach(dto => dto.Ratings)
                    .SetValidator(new ReviewRatingDtoValidator());
            }
        }

        internal sealed class ReviewRatingDtoValidator : AbstractValidator<ReviewRatingDto>
        {
            public ReviewRatingDtoValidator()
            {
                RuleFor(dto => dto.Key)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Rating key is required.")
                    .WithErrorCode("REVIEW_INVALID_INPUT")
                    .Must(BeNonWhitespace)
                    .WithMessage("Rating key is required.")
                    .WithErrorCode("REVIEW_INVALID_INPUT");

                RuleFor(dto => dto.Score)
                    .InclusiveBetween(0, 5)
                    .WithMessage("Score must be between 0 and 5.");
            }
        }

        private static bool BeNonWhitespace(string? value) => !string.IsNullOrWhiteSpace(value);
    }
}
