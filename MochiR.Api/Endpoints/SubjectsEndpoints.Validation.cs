using FluentValidation;

namespace MochiR.Api.Endpoints
{
    public static partial class SubjectsEndpoints
    {
        internal sealed class CreateSubjectDtoValidator : AbstractValidator<CreateSubjectDto>
        {
            public CreateSubjectDtoValidator()
            {
                RuleFor(dto => dto.Name)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Name is required.")
                    .WithErrorCode("SUBJECT_INVALID_INPUT")
                    .Must(BeNonWhitespace)
                    .WithMessage("Name is required.")
                    .WithErrorCode("SUBJECT_INVALID_INPUT");

                RuleFor(dto => dto.Slug)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Slug is required.")
                    .WithErrorCode("SUBJECT_INVALID_INPUT")
                    .Must(BeNonWhitespace)
                    .WithMessage("Slug is required.")
                    .WithErrorCode("SUBJECT_INVALID_INPUT");

                RuleFor(dto => dto.SubjectTypeId)
                    .GreaterThan(0)
                    .WithMessage("SubjectTypeId is required.")
                    .WithErrorCode("SUBJECT_INVALID_INPUT");

                RuleForEach(dto => dto.Attributes)
                    .SetValidator(new SubjectAttributeDtoValidator());
            }
        }

        internal sealed class UpdateSubjectDtoValidator : AbstractValidator<UpdateSubjectDto>
        {
            public UpdateSubjectDtoValidator()
            {
                RuleFor(dto => dto.Name)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Name is required.")
                    .WithErrorCode("SUBJECT_INVALID_INPUT")
                    .Must(BeNonWhitespace)
                    .WithMessage("Name is required.")
                    .WithErrorCode("SUBJECT_INVALID_INPUT");

                RuleFor(dto => dto.Slug)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Slug is required.")
                    .WithErrorCode("SUBJECT_INVALID_INPUT")
                    .Must(BeNonWhitespace)
                    .WithMessage("Slug is required.")
                    .WithErrorCode("SUBJECT_INVALID_INPUT");

                RuleFor(dto => dto.SubjectTypeId)
                    .GreaterThan(0)
                    .WithMessage("SubjectTypeId is required.")
                    .WithErrorCode("SUBJECT_INVALID_INPUT");

                RuleForEach(dto => dto.Attributes)
                    .SetValidator(new SubjectAttributeDtoValidator());
            }
        }

        internal sealed class SubjectAttributeDtoValidator : AbstractValidator<SubjectAttributeDto>
        {
            public SubjectAttributeDtoValidator()
            {
                RuleFor(dto => dto.Key)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Attribute key is required.")
                    .WithErrorCode("SUBJECT_INVALID_INPUT")
                    .Must(BeNonWhitespace)
                    .WithMessage("Attribute key is required.")
                    .WithErrorCode("SUBJECT_INVALID_INPUT");
            }
        }

        private static bool BeNonWhitespace(string? value) => !string.IsNullOrWhiteSpace(value);
    }
}
