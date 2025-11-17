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
                    .WithErrorCode("REVIEW_INVALID_INPUT")
                    .MaximumLength(MaxTitleLength)
                    .WithMessage($"Title cannot exceed {MaxTitleLength} characters.")
                    .WithErrorCode("REVIEW_INVALID_INPUT");

                RuleForEach(dto => dto.Ratings)
                    .SetValidator(new ReviewRatingDtoValidator());

                RuleFor(dto => dto.Content)
                    .MaximumLength(MaxContentLength)
                    .WithMessage($"Content cannot exceed {MaxContentLength} characters.")
                    .WithErrorCode("REVIEW_INVALID_INPUT");

                RuleFor(dto => dto.Excerpt)
                    .MaximumLength(MaxExcerptLength)
                    .WithMessage($"Excerpt cannot exceed {MaxExcerptLength} characters.")
                    .WithErrorCode("REVIEW_INVALID_INPUT");

                RuleFor(dto => dto.Tags)
                    .Must(tags => tags is null || tags.Count <= MaxTagsPerReview)
                    .WithMessage($"You can provide up to {MaxTagsPerReview} tags.")
                    .WithErrorCode("REVIEW_INVALID_INPUT");

                RuleFor(dto => dto.Tags)
                    .Must(HaveDistinctTags)
                    .WithMessage("Tags must be unique.")
                    .WithErrorCode("REVIEW_INVALID_INPUT");

                RuleForEach(dto => dto.Tags)
                    .Cascade(CascadeMode.Stop)
                    .Must(BeNonWhitespace)
                    .WithMessage("Tags cannot be blank.")
                    .WithErrorCode("REVIEW_INVALID_INPUT")
                    .Must(tag => tag!.Trim().Length <= MaxTagLength)
                    .WithMessage($"Tags cannot exceed {MaxTagLength} characters.")
                    .WithErrorCode("REVIEW_INVALID_INPUT");
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
                    .WithErrorCode("REVIEW_INVALID_INPUT")
                    .MaximumLength(MaxTitleLength)
                    .WithMessage($"Title cannot exceed {MaxTitleLength} characters.")
                    .WithErrorCode("REVIEW_INVALID_INPUT");

                RuleForEach(dto => dto.Ratings)
                    .SetValidator(new ReviewRatingDtoValidator());

                RuleFor(dto => dto.Content)
                    .MaximumLength(MaxContentLength)
                    .WithMessage($"Content cannot exceed {MaxContentLength} characters.")
                    .WithErrorCode("REVIEW_INVALID_INPUT");

                RuleFor(dto => dto.Excerpt)
                    .MaximumLength(MaxExcerptLength)
                    .WithMessage($"Excerpt cannot exceed {MaxExcerptLength} characters.")
                    .WithErrorCode("REVIEW_INVALID_INPUT");

                RuleFor(dto => dto.Tags)
                    .Must(tags => tags is null || tags.Count <= MaxTagsPerReview)
                    .WithMessage($"You can provide up to {MaxTagsPerReview} tags.")
                    .WithErrorCode("REVIEW_INVALID_INPUT");

                RuleFor(dto => dto.Tags)
                    .Must(HaveDistinctTags)
                    .WithMessage("Tags must be unique.")
                    .WithErrorCode("REVIEW_INVALID_INPUT");

                RuleForEach(dto => dto.Tags)
                    .Cascade(CascadeMode.Stop)
                    .Must(BeNonWhitespace)
                    .WithMessage("Tags cannot be blank.")
                    .WithErrorCode("REVIEW_INVALID_INPUT")
                    .Must(tag => tag!.Trim().Length <= MaxTagLength)
                    .WithMessage($"Tags cannot exceed {MaxTagLength} characters.")
                    .WithErrorCode("REVIEW_INVALID_INPUT");
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

        internal sealed class LatestReviewsQueryDtoValidator : AbstractValidator<LatestReviewsQueryDto>
        {
            public LatestReviewsQueryDtoValidator()
            {
                RuleFor(q => q.Page)
                    .GreaterThan(0)
                    .When(q => q.Page.HasValue)
                    .WithMessage("Page must be greater than zero.")
                    .WithErrorCode("REVIEW_INVALID_QUERY");

                RuleFor(q => q.PageSize)
                    .GreaterThan(0)
                    .When(q => q.PageSize.HasValue)
                    .WithMessage("PageSize must be greater than zero.")
                    .WithErrorCode("REVIEW_INVALID_QUERY");

                RuleFor(q => q.PageSize)
                    .LessThanOrEqualTo(LatestMaxPageSize)
                    .When(q => q.PageSize.HasValue)
                    .WithMessage($"PageSize cannot exceed {LatestMaxPageSize}.")
                    .WithErrorCode("REVIEW_INVALID_QUERY");

                RuleFor(q => q.AfterId)
                    .GreaterThan(0)
                    .When(q => q.AfterId.HasValue)
                    .WithMessage("AfterId must be greater than zero.")
                    .WithErrorCode("REVIEW_INVALID_QUERY");
            }
        }

        private static bool BeNonWhitespace(string? value) => !string.IsNullOrWhiteSpace(value);
    }
}
