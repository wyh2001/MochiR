namespace MochiR.Api.Services.Email
{
    public interface IIdentityEmailComposer
    {
        EmailTemplate ComposeEmailToken(string recipient, string purpose, string token);
    }

    public sealed record EmailTemplate(string Subject, string Body);
}
