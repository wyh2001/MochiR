namespace MochiR.Api.Services.Email
{
    public sealed class IdentityEmailOptions
    {
        public string? BaseUrl { get; set; }
        public string ConfirmPath { get; set; } = "/account/email/confirm";
        public string ChangePath { get; set; } = "/account/email/change";
        public string ResetPasswordPath { get; set; } = "/account/password/reset";
    }
}
