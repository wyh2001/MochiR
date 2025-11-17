using FluentValidation;

namespace MochiR.Api.Endpoints
{
    public static partial class UsersEndpoints
    {
        internal sealed class SelfPasswordChangeRequestDtoValidator : AbstractValidator<SelfPasswordChangeRequestDto>
        {
            public SelfPasswordChangeRequestDtoValidator()
            {
                RuleFor(dto => dto.CurrentPassword)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Current password is required.")
                    .WithErrorCode("SELF_PASSWORD_INVALID_PAYLOAD")
                    .Must(BeNonWhitespace)
                    .WithMessage("Current password is required.")
                    .WithErrorCode("SELF_PASSWORD_INVALID_PAYLOAD");

                RuleFor(dto => dto.NewPassword)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("New password is required.")
                    .WithErrorCode("SELF_PASSWORD_INVALID_PAYLOAD")
                    .Must(BeNonWhitespace)
                    .WithMessage("New password is required.")
                    .WithErrorCode("SELF_PASSWORD_INVALID_PAYLOAD");
            }
        }

        internal sealed class SelfEmailConfirmRequestDtoValidator : AbstractValidator<SelfEmailConfirmRequestDto>
        {
            public SelfEmailConfirmRequestDtoValidator()
            {
                RuleFor(dto => dto.Token)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Token is required.")
                    .WithErrorCode("SELF_EMAIL_TOKEN_REQUIRED")
                    .Must(BeNonWhitespace)
                    .WithMessage("Token is required.")
                    .WithErrorCode("SELF_EMAIL_TOKEN_REQUIRED");
            }
        }

        internal sealed class CreateUserDtoValidator : AbstractValidator<CreateUserDto>
        {
            public CreateUserDtoValidator()
            {
                RuleFor(dto => dto.UserName)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("User name is required.")
                    .WithErrorCode("USER_CREATE_INVALID_PAYLOAD")
                    .Must(BeNonWhitespace)
                    .WithMessage("User name is required.")
                    .WithErrorCode("USER_CREATE_INVALID_PAYLOAD");

                RuleFor(dto => dto.Email)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Email is required.")
                    .WithErrorCode("USER_CREATE_INVALID_PAYLOAD")
                    .Must(BeNonWhitespace)
                    .WithMessage("Email is required.")
                    .EmailAddress()
                    .WithErrorCode("USER_CREATE_INVALID_PAYLOAD");

                RuleFor(dto => dto.Password)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .WithMessage("Password is required.")
                    .WithErrorCode("USER_CREATE_INVALID_PAYLOAD")
                    .Must(BeNonWhitespace)
                    .WithMessage("Password is required.")
                    .WithErrorCode("USER_CREATE_INVALID_PAYLOAD");

                RuleForEach(dto => dto.Roles)
                    .Must(role => !string.IsNullOrWhiteSpace(role))
                    .When(dto => dto.Roles is not null)
                    .WithMessage("Roles cannot contain blank entries.");
            }
        }

        internal sealed class DirectoryAdminPatchRequestDtoValidator : AbstractValidator<DirectoryAdminPatchRequestDto>
        {
            public DirectoryAdminPatchRequestDtoValidator()
            {
                RuleFor(dto => dto.Email)
                    .Custom((optional, context) =>
                    {
                        if (optional.IsUndefined || optional.IsNull)
                        {
                            return;
                        }

                        if (!optional.TryGet(out var value))
                        {
                            context.AddFailure("Email", "Email is required when provided.");
                            return;
                        }

                        if (string.IsNullOrWhiteSpace(value))
                        {
                            context.AddFailure("Email", "Email cannot be blank.");
                            return;
                        }

                        var emailValidationResult = EmailValueValidator.Validate(value);
                        if (!emailValidationResult.IsValid)
                        {
                            foreach (var failure in emailValidationResult.Errors)
                            {
                                context.AddFailure("Email", failure.ErrorMessage);
                            }
                        }
                    });

                RuleFor(dto => dto.PhoneNumber)
                    .Custom((optional, context) =>
                    {
                        if (optional.IsUndefined || optional.IsNull)
                        {
                            return;
                        }

                        if (!optional.TryGet(out var value))
                        {
                            context.AddFailure("PhoneNumber", "Phone number is required when provided.");
                            return;
                        }

                        if (string.IsNullOrWhiteSpace(value))
                        {
                            context.AddFailure("PhoneNumber", "Phone number cannot be blank.");
                        }
                    });

                RuleFor(dto => dto.Roles)
                    .Custom((optional, context) =>
                    {
                        if (optional.IsUndefined || optional.IsNull)
                        {
                            return;
                        }

                        if (!optional.TryGet(out var roles) || roles is null)
                        {
                            context.AddFailure("Roles", "Roles cannot be null when provided.");
                            return;
                        }

                        if (roles.Any(role => string.IsNullOrWhiteSpace(role)))
                        {
                            context.AddFailure("Roles", "Roles cannot contain blank entries.");
                        }
                    });
            }
        }

        private static bool BeNonWhitespace(string? value) => !string.IsNullOrWhiteSpace(value);

        private static readonly InlineValidator<string> EmailValueValidator = CreateEmailValueValidator();

        private static InlineValidator<string> CreateEmailValueValidator()
        {
            var validator = new InlineValidator<string>();
            validator.RuleFor(email => email)
                .EmailAddress()
                .WithMessage("Email must be a valid email address.");
            return validator;
        }
    }
}
