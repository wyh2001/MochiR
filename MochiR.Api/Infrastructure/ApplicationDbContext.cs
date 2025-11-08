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
        public DbSet<ReviewLike> ReviewLikes => Set<ReviewLike>();
        public DbSet<Aggregate> Aggregates => Set<Aggregate>();
        public DbSet<Follow> Follows => Set<Follow>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.HasPostgresExtension("unaccent");
            builder.HasPostgresExtension("pg_trgm");
            builder.HasPostgresExtension("citext");

            // Subject
            builder.Entity<Subject>(e =>
            {
                e.Property(s => s.SearchVector)
                    .HasColumnType("tsvector")
                    .HasComputedColumnSql(
                        "setweight(to_tsvector('simple', unaccent(coalesce(\"Name\", ''))), 'A') || " +
                        "setweight(to_tsvector('simple', unaccent(coalesce(\"Slug\", ''))), 'B')",
                        stored: true);

                e.HasIndex(s => s.SearchVector).HasMethod("GIN");

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

                e.OwnsMany(s => s.Attributes, attributesBuilder =>
                {
                    attributesBuilder.WithOwner().HasForeignKey("SubjectId");
                    attributesBuilder.Property(a => a.Key).IsRequired();
                    attributesBuilder.Property(a => a.Value).HasMaxLength(512);
                    attributesBuilder.Property(a => a.Note).HasMaxLength(256);
                    attributesBuilder.ToTable("SubjectAttributes");
                });
            });

            // SubjectType
            builder.Entity<SubjectType>(e =>
            {
                e.HasIndex(t => t.Key).IsUnique();
                e.Property(t => t.Key).IsRequired();
                e.Property(t => t.DisplayName).IsRequired();

                e.OwnsMany(t => t.Settings, settingsBuilder =>
                {
                    settingsBuilder.WithOwner().HasForeignKey("SubjectTypeId");
                    settingsBuilder.Property(s => s.Key).IsRequired();
                    settingsBuilder.Property(s => s.Value).HasMaxLength(512);
                    settingsBuilder.Property(s => s.Note).HasMaxLength(256);
                    settingsBuilder.ToTable("SubjectTypeSettings");
                });
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
                e.Property(r => r.SearchVector)
                    .HasColumnType("tsvector")
                    .HasComputedColumnSql(
                        "setweight(to_tsvector('simple', unaccent(coalesce(\"Title\", ''))), 'A') || " +
                        "setweight(to_tsvector('simple', unaccent(coalesce(\"Excerpt\", ''))), 'B') || " +
                        "setweight(to_tsvector('simple', unaccent(coalesce(\"Content\", ''))), 'C')",
                        stored: true);

                e.HasIndex(r => r.SearchVector).HasMethod("GIN");

                // Filtered unique index: UNIQUE(UserId, SubjectId) WHERE IsDeleted = 0
                e.HasIndex(r => new { r.UserId, r.SubjectId })
                    .IsUnique()
                    .HasFilter("\"IsDeleted\" = false");

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

                e.Property(r => r.Title)
                    .HasMaxLength(256);

                e.Property(r => r.Content)
                    .HasMaxLength(20000);

                e.Property(r => r.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                e.Property(r => r.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

                e.OwnsMany(r => r.Ratings, ratingsBuilder =>
                {
                    ratingsBuilder.WithOwner().HasForeignKey("ReviewId");
                    ratingsBuilder.Property(rr => rr.Key).IsRequired();
                    ratingsBuilder.Property(rr => rr.Score).HasColumnType("decimal(4,2)");
                    ratingsBuilder.Property(rr => rr.Label).HasMaxLength(128);
                    ratingsBuilder.ToTable("ReviewRatings");
                });

                e.OwnsMany(r => r.Tags, tagsBuilder =>
                {
                    tagsBuilder.WithOwner().HasForeignKey("ReviewId");
                    tagsBuilder.Property(tag => tag.Value)
                        .IsRequired()
                        .HasMaxLength(32)
                        .HasColumnType("citext");
                    tagsBuilder.HasIndex("ReviewId", nameof(ReviewTag.Value))
                        .IsUnique();
                    tagsBuilder.ToTable("ReviewTags");
                });

                e.HasMany(r => r.Likes)
                    .WithOne(l => l.Review)
                    .HasForeignKey(l => l.ReviewId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ReviewMedia
            builder.Entity<ReviewMedia>(e =>
            {
                e.Property(m => m.Type).HasConversion<int>();
                e.HasOne(m => m.Review)
                    .WithMany(r => r.Media)
                    .HasForeignKey(m => m.ReviewId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.OwnsMany(m => m.Metadata, metadataBuilder =>
                {
                    metadataBuilder.WithOwner().HasForeignKey("ReviewMediaId");
                    metadataBuilder.Property(md => md.Key).IsRequired();
                    metadataBuilder.Property(md => md.Value).HasMaxLength(512);
                    metadataBuilder.Property(md => md.Note).HasMaxLength(256);
                    metadataBuilder.ToTable("ReviewMediaMetadata");
                });
            });

            // Aggregate
            builder.Entity<Aggregate>(e =>
            {
                e.HasKey(a => a.SubjectId);
                e.Property(a => a.AvgOverall).HasColumnType("decimal(4,2)");
                e.Property(a => a.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

                e.OwnsMany(a => a.Metrics, metricsBuilder =>
                {
                    metricsBuilder.WithOwner().HasForeignKey("AggregateSubjectId");
                    metricsBuilder.Property(m => m.Key).IsRequired();
                    metricsBuilder.Property(m => m.Value).HasColumnType("decimal(6,2)");
                    metricsBuilder.Property(m => m.Count);
                    metricsBuilder.Property(m => m.Note).HasMaxLength(256);
                    metricsBuilder.ToTable("AggregateMetrics");
                });
            });

            // Follow
            builder.Entity<Follow>(e =>
            {
                e.Property(f => f.TargetType).HasConversion<int>();
                e.Property(f => f.CreatedAtUtc).HasDefaultValueSql("CURRENT_TIMESTAMP");

                e.HasOne(f => f.Follower)
                    .WithMany()
                    .HasForeignKey(f => f.FollowerId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(f => f.Subject)
                    .WithMany()
                    .HasForeignKey(f => f.SubjectId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(f => f.SubjectType)
                    .WithMany()
                    .HasForeignKey(f => f.SubjectTypeId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(f => f.FollowedUser)
                    .WithMany()
                    .HasForeignKey(f => f.FollowedUserId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasIndex(f => new { f.FollowerId, f.TargetType, f.SubjectId })
                    .IsUnique()
                    .HasFilter("\"SubjectId\" IS NOT NULL");

                e.HasIndex(f => new { f.FollowerId, f.TargetType, f.SubjectTypeId })
                    .IsUnique()
                    .HasFilter("\"SubjectTypeId\" IS NOT NULL");

                e.HasIndex(f => new { f.FollowerId, f.TargetType, f.FollowedUserId })
                    .IsUnique()
                    .HasFilter("\"FollowedUserId\" IS NOT NULL");
            });

            // ReviewLike
            builder.Entity<ReviewLike>(e =>
            {
                e.Property(l => l.CreatedAtUtc).HasDefaultValueSql("CURRENT_TIMESTAMP");

                e.HasOne(l => l.User)
                    .WithMany()
                    .HasForeignKey(l => l.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasIndex(l => new { l.ReviewId, l.UserId })
                    .IsUnique();
            });
        }
    }
}
