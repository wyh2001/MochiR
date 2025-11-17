using MochiR.Api.Services.Email;

namespace MochiR.Tests;

public sealed class NoopEmailSender : IEmailSender
{
    public Task SendAsync(string recipient, string subject, string body, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
}
