using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;

namespace MochiR.Api.Services.Email
{
    public sealed class DefaultIdentityEmailComposer : IIdentityEmailComposer
    {
        private readonly IdentityEmailOptions options;

        public DefaultIdentityEmailComposer(IOptions<IdentityEmailOptions> optionsAccessor)
        {
            options = optionsAccessor?.Value ?? new IdentityEmailOptions();
        }

        public EmailTemplate ComposeEmailToken(string recipient, string purpose, string token)
        {
            var subject = purpose switch
            {
                EmailTokenPurpose.Change => "Confirm your new email address",
                EmailTokenPurpose.ResetPassword => "Reset your password",
                _ => "Confirm your email address"
            };

            var action = purpose switch
            {
                EmailTokenPurpose.Change => "confirm your new email address",
                EmailTokenPurpose.ResetPassword => "reset your password",
                _ => "confirm your email address"
            };

            var closing = purpose switch
            {
                EmailTokenPurpose.Change => "If you did not request this change, you can ignore this email.",
                EmailTokenPurpose.ResetPassword => "If you did not request a password reset, you can ignore this email.",
                _ => "If you did not request this change, you can ignore this email."
            };

            var builder = new StringBuilder();
            builder.Append("Use the following link to ");
            builder.Append(action);
            builder.Append(':');
            builder.AppendLine();
            builder.AppendLine(BuildLink(recipient, purpose, token));
            builder.AppendLine();
            builder.AppendLine();
            builder.Append(closing);

            return new EmailTemplate(subject, builder.ToString());
        }

        private string BuildLink(string recipient, string purpose, string token)
        {
            var baseUrl = options.BaseUrl?.TrimEnd('/');
            var path = NormalizePath(purpose);

            var parameters = new Dictionary<string, string?>(StringComparer.Ordinal)
            {
                ["purpose"] = purpose,
                ["token"] = token
            };

            if (!string.IsNullOrEmpty(recipient) &&
                (string.Equals(purpose, EmailTokenPurpose.Change, StringComparison.Ordinal) ||
                 string.Equals(purpose, EmailTokenPurpose.ResetPassword, StringComparison.Ordinal)))
            {
                parameters["email"] = recipient;
            }

            var relative = QueryHelpers.AddQueryString(path, parameters);
            if (string.IsNullOrEmpty(baseUrl))
            {
                return relative;
            }

            return string.Concat(baseUrl, relative);
        }

        private string NormalizePath(string purpose)
        {
            var path = purpose switch
            {
                EmailTokenPurpose.Change => options.ChangePath,
                EmailTokenPurpose.ResetPassword => options.ResetPasswordPath,
                _ => options.ConfirmPath
            } ?? string.Empty;

            path = path.Trim();
            if (path.Length == 0)
            {
                path = purpose switch
                {
                    EmailTokenPurpose.Change => "/account/email/change",
                    EmailTokenPurpose.ResetPassword => "/account/password/reset",
                    _ => "/account/email/confirm"
                };
            }

            if (!path.StartsWith('/'))
            {
                path = "/" + path;
            }

            return path;
        }
    }
}
