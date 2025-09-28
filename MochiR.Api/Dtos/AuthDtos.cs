namespace MochiR.Api.Dtos
{
    public class AuthDtos
    {
        public record RegisterDto(string UserName, string Email, string Password);
        public record LoginDto(string UserNameOrEmail, string Password);
    }
}
