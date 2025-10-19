namespace MochiR.Api.Services
{
    public sealed class ConsoleEmailSender(ILogger<ConsoleEmailSender> logger) : IEmailSender
    {
        private readonly ILogger<ConsoleEmailSender> logger = logger;

        public Task SendAsync(string recipient, string subject, string body, CancellationToken cancellationToken = default)
        {
            logger.LogInformation("Sending email to {Recipient}\nSubject: {Subject}\n{Body}", recipient, subject, body);
            return Task.CompletedTask;
        }
    }
}
