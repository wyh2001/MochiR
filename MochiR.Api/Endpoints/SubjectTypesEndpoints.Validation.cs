using FluentValidation;

namespace MochiR.Api.Endpoints
{
    public static partial class SubjectTypesEndpoints
    {
        internal sealed class CreateSubjectTypeDtoValidator : AbstractValidator<CreateSubjectTypeDto>
        {
            public CreateSubjectTypeDtoValidator()
            {
                RuleFor(dto => dto.Key)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Key is required.")
                    .WithErrorCode("SUBJECT_TYPE_INVALID_INPUT")
                    .Must(BeNonWhitespace)
                    .WithMessage("Key is required.")
                    .WithErrorCode("SUBJECT_TYPE_INVALID_INPUT");

                RuleFor(dto => dto.DisplayName)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Display name is required.")
                    .WithErrorCode("SUBJECT_TYPE_INVALID_INPUT")
                    .Must(BeNonWhitespace)
                    .WithMessage("Display name is required.")
                    .WithErrorCode("SUBJECT_TYPE_INVALID_INPUT");

                RuleForEach(dto => dto.Settings)
                    .SetValidator(new SubjectTypeSettingDtoValidator());
            }
        }

        internal sealed class UpdateSubjectTypeDtoValidator : AbstractValidator<UpdateSubjectTypeDto>
        {
            public UpdateSubjectTypeDtoValidator()
            {
                RuleFor(dto => dto.Key)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Key is required.")
                    .WithErrorCode("SUBJECT_TYPE_INVALID_INPUT")
                    .Must(BeNonWhitespace)
                    .WithMessage("Key is required.")
                    .WithErrorCode("SUBJECT_TYPE_INVALID_INPUT");

                RuleFor(dto => dto.DisplayName)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Display name is required.")
                    .WithErrorCode("SUBJECT_TYPE_INVALID_INPUT")
                    .Must(BeNonWhitespace)
                    .WithMessage("Display name is required.")
                    .WithErrorCode("SUBJECT_TYPE_INVALID_INPUT");

                RuleForEach(dto => dto.Settings)
                    .SetValidator(new SubjectTypeSettingDtoValidator());
            }
        }

        internal sealed class SubjectTypeSettingDtoValidator : AbstractValidator<SubjectTypeSettingDto>
        {
            public SubjectTypeSettingDtoValidator()
            {
                RuleFor(dto => dto.Key)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Setting key is required.")
                    .WithErrorCode("SUBJECT_TYPE_INVALID_INPUT")
                    .Must(BeNonWhitespace)
                    .WithMessage("Setting key is required.");
            }
        }

        private static bool BeNonWhitespace(string? value) => !string.IsNullOrWhiteSpace(value);
    }
}
