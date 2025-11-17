using FluentValidation;
using static MochiR.Api.Dtos.AuthDtos;

namespace MochiR.Api.Endpoints
{
    public static partial class AuthEndpoints
    {
        internal sealed class RegisterDtoValidator : AbstractValidator<RegisterDto>
        {
            public RegisterDtoValidator()
            {
                RuleFor(dto => dto.UserName)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .Must(value => !string.IsNullOrWhiteSpace(value))
                    .WithMessage("User name is required.")
                    .WithErrorCode("AUTH_REGISTER_INVALID");

                RuleFor(dto => dto.Email)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .Must(value => !string.IsNullOrWhiteSpace(value))
                    .WithMessage("Email is required.")
                    .EmailAddress()
                    .WithErrorCode("AUTH_REGISTER_INVALID");

                RuleFor(dto => dto.Password)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .Must(value => !string.IsNullOrWhiteSpace(value))
                    .WithMessage("Password is required.")
                    .WithErrorCode("AUTH_REGISTER_INVALID");
            }
        }

        internal sealed class LoginDtoValidator : AbstractValidator<LoginDto>
        {
            public LoginDtoValidator()
            {
                RuleFor(dto => dto.UserNameOrEmail)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .Must(value => !string.IsNullOrWhiteSpace(value))
                    .WithMessage("User name or email is required.")
                    .WithErrorCode("AUTH_LOGIN_INVALID");

                RuleFor(dto => dto.Password)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .Must(value => !string.IsNullOrWhiteSpace(value))
                    .WithMessage("Password is required.")
                    .WithErrorCode("AUTH_LOGIN_INVALID");
            }
        }

        internal sealed class PasswordResetTokenRequestDtoValidator : AbstractValidator<PasswordResetTokenRequestDto>
        {
            public PasswordResetTokenRequestDtoValidator()
            {
                RuleFor(dto => dto.Email)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .Must(value => !string.IsNullOrWhiteSpace(value))
                    .WithMessage("Email is required.")
                    .EmailAddress()
                    .WithErrorCode("AUTH_PASSWORD_RESET_EMAIL_INVALID");
            }
        }

        internal sealed class PasswordResetConfirmRequestDtoValidator : AbstractValidator<PasswordResetConfirmRequestDto>
        {
            public PasswordResetConfirmRequestDtoValidator()
            {
                RuleFor(dto => dto.Email)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .Must(value => !string.IsNullOrWhiteSpace(value))
                    .WithMessage("Email is required.")
                    .EmailAddress()
                    .WithErrorCode("AUTH_PASSWORD_RESET_INVALID_PAYLOAD");

                RuleFor(dto => dto.Token)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .Must(value => !string.IsNullOrWhiteSpace(value))
                    .WithMessage("Token is required.")
                    .WithErrorCode("AUTH_PASSWORD_RESET_INVALID_PAYLOAD");

                RuleFor(dto => dto.NewPassword)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .Must(value => !string.IsNullOrWhiteSpace(value))
                    .WithMessage("New password is required.")
                    .WithErrorCode("AUTH_PASSWORD_RESET_INVALID_PAYLOAD");
            }
        }
    }
}
