using Microsoft.AspNetCore.Identity;

namespace MochiR.Api.Entities
{
    public class ApplicationUser : IdentityUser
    {
        [PersonalData]
        public string? DisplayName { get; set; }
        [PersonalData]
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
    //public class ApplicationRole : IdentityRole { }
}
