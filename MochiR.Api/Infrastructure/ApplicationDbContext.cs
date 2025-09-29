using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using MochiR.Api.Entities;

namespace MochiR.Api.Infrastructure
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) :
        base(options)
        { }

        public DbSet<Subject> Subjects => Set<Subject>();
        public DbSet<SubjectType> SubjectTypes => Set<SubjectType>();
        public DbSet<CriteriaTemplate> CriteriaTemplates => Set<CriteriaTemplate>();
        public DbSet<Review> Reviews => Set<Review>();
        public DbSet<ReviewMedia> ReviewMedia => Set<ReviewMedia>();
        public DbSet<Aggregate> Aggregates => Set<Aggregate>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Subject
            builder.Entity<Subject>(e =>
            {
                e.HasIndex(s => s.Slug).IsUnique();
                e.Property(s => s.Name).IsRequired();
                e.Property(s => s.Slug).IsRequired();
                e.HasOne(s => s.SubjectType)
                    .WithMany()
                    .HasForeignKey(s => s.SubjectTypeId)
                    .OnDelete(DeleteBehavior.Restrict);

                // 1:1 Aggregate
                e.HasOne<Aggregate>()
                    .WithOne(a => a.Subject!)
                    .HasForeignKey<Aggregate>(a => a.SubjectId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // SubjectType
            builder.Entity<SubjectType>(e =>
            {
                e.HasIndex(t => t.Key).IsUnique();
                e.Property(t => t.Key).IsRequired();
                e.Property(t => t.DisplayName).IsRequired();
            });

            // CriteriaTemplate
            builder.Entity<CriteriaTemplate>(e =>
            {
                e.HasIndex(ct => new { ct.SubjectTypeId, ct.Key }).IsUnique();
                e.Property(ct => ct.Key).IsRequired();
                e.Property(ct => ct.DisplayName).IsRequired();
                e.HasOne(ct => ct.SubjectType)
                    .WithMany()
                    .HasForeignKey(ct => ct.SubjectTypeId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Review
            builder.Entity<Review>(e =>
            {
                // Filtered unique index: UNIQUE(UserId, SubjectId) WHERE IsDeleted = 0
                e.HasIndex(r => new { r.UserId, r.SubjectId })
                    .IsUnique()
                    .HasFilter("[IsDeleted] = 0");

                e.Property(r => r.Status)
                    .HasConversion<int>();

                e.HasOne(r => r.Subject)
                    .WithMany()
                    .HasForeignKey(r => r.SubjectId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(r => r.User)
                    .WithMany()
                    .HasForeignKey(r => r.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.Property(r => r.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
                e.Property(r => r.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");
            });

            // ReviewMedia
            builder.Entity<ReviewMedia>(e =>
            {
                e.Property(m => m.Type).HasConversion<int>();
                e.HasOne(m => m.Review)
                    .WithMany(r => r.Media)
                    .HasForeignKey(m => m.ReviewId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Aggregate
            builder.Entity<Aggregate>(e =>
            {
                e.HasKey(a => a.SubjectId);
                e.Property(a => a.AvgOverall).HasColumnType("decimal(4,2)");
                e.Property(a => a.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");
            });
        }
    }
}
