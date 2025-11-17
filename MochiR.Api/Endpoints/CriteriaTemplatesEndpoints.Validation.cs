using FluentValidation;

namespace MochiR.Api.Endpoints
{
    public static partial class CriteriaTemplatesEndpoints
    {
        internal sealed class CreateCriteriaTemplateDtoValidator : AbstractValidator<CreateCriteriaTemplateDto>
        {
            public CreateCriteriaTemplateDtoValidator()
            {
                RuleFor(dto => dto.SubjectTypeId)
                    .GreaterThan(0)
                    .WithMessage("SubjectTypeId is required.")
                    .WithErrorCode("CRITERIA_TEMPLATE_INVALID_INPUT");

                RuleFor(dto => dto.Key)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Key is required.")
                    .WithErrorCode("CRITERIA_TEMPLATE_INVALID_INPUT")
                    .Must(BeNonWhitespace)
                    .WithMessage("Key is required.")
                    .WithErrorCode("CRITERIA_TEMPLATE_INVALID_INPUT");

                RuleFor(dto => dto.DisplayName)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Display name is required.")
                    .WithErrorCode("CRITERIA_TEMPLATE_INVALID_INPUT")
                    .Must(BeNonWhitespace)
                    .WithMessage("Display name is required.")
                    .WithErrorCode("CRITERIA_TEMPLATE_INVALID_INPUT");
            }
        }

        private static bool BeNonWhitespace(string? value) => !string.IsNullOrWhiteSpace(value);
    }
}
