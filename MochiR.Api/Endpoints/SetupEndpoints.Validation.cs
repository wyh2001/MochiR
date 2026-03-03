using FluentValidation;

namespace MochiR.Api.Endpoints
{
    public static partial class SetupEndpoints
    {
        internal sealed class CreateInitialAdminRequestDtoValidator : AbstractValidator<CreateInitialAdminRequestDto>
        {
            public CreateInitialAdminRequestDtoValidator()
            {
                RuleFor(dto => dto.UserName)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .Must(value => !string.IsNullOrWhiteSpace(value))
                    .WithMessage("User name is required.")
                    .WithErrorCode("SETUP_INVALID_INPUT");

                RuleFor(dto => dto.Email)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .Must(value => !string.IsNullOrWhiteSpace(value))
                    .WithMessage("Email is required.")
                    .EmailAddress()
                    .WithErrorCode("SETUP_INVALID_INPUT");

                RuleFor(dto => dto.Password)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty()
                    .Must(value => !string.IsNullOrWhiteSpace(value))
                    .WithMessage("Password is required.")
                    .WithErrorCode("SETUP_INVALID_INPUT");
            }
        }
    }
}
