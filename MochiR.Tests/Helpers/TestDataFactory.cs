using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;

namespace MochiR.Tests.Helpers;

public static class TestDataFactory
{
    public static async Task<SubjectType> CreateSubjectTypeAsync(this WebApplicationFactory<Program> factory, string? key = null, string? displayName = null)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var subjectType = new SubjectType
        {
            Key = key ?? $"type-{Guid.NewGuid():N}",
            DisplayName = displayName ?? $"Type {Guid.NewGuid():N}"
        };

        db.SubjectTypes.Add(subjectType);
        await db.SaveChangesAsync();
        return subjectType;
    }

    public static async Task<Subject> CreateSubjectAsync(this WebApplicationFactory<Program> factory, SubjectType subjectType, string? name = null, string? slug = null)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var subject = new Subject
        {
            SubjectTypeId = subjectType.Id,
            Name = name ?? $"Subject {Guid.NewGuid():N}",
            Slug = slug ?? $"subject-{Guid.NewGuid():N}",
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        db.Subjects.Add(subject);
        await db.SaveChangesAsync();
        return subject;
    }

    public static async Task<ApplicationUser> CreateUserAsync(this WebApplicationFactory<Program> factory, string? userName = null, string? email = null)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = new ApplicationUser
        {
            UserName = userName ?? $"user-{Guid.NewGuid():N}",
            Email = email ?? $"user-{Guid.NewGuid():N}@example.com",
            EmailConfirmed = true,
            LockoutEnabled = false
        };

        var result = await userManager.CreateAsync(user);
        Assert.True(result.Succeeded, string.Join(",", result.Errors.Select(e => e.Description)));
        return user;
    }

    public static async Task<Review> CreateReviewAsync(
        this WebApplicationFactory<Program> factory,
        string authorId,
        int subjectId,
        DateTime createdAt,
        string title,
        ReviewStatus status = ReviewStatus.Approved,
        bool isDeleted = false,
        string? content = null)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var review = new Review
        {
            SubjectId = subjectId,
            UserId = authorId,
            Title = title,
            Content = content ?? $"Content for {title}",
            Status = status,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
            IsDeleted = isDeleted,
            MediaCount = 0
        };

        db.Reviews.Add(review);
        await db.SaveChangesAsync();
        return review;
    }

    public static async Task CreateFollowAsync(
        this WebApplicationFactory<Program> factory,
        string followerId,
        FollowTargetType targetType,
        int? subjectId = null,
        int? subjectTypeId = null,
        string? followedUserId = null)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var follow = new Follow
        {
            FollowerId = followerId,
            TargetType = targetType,
            SubjectId = subjectId,
            SubjectTypeId = subjectTypeId,
            FollowedUserId = followedUserId,
            CreatedAtUtc = DateTime.UtcNow
        };

        db.Follows.Add(follow);

        if (targetType == FollowTargetType.User)
        {
            if (followerId is not null)
            {
                var follower = await db.Users.FindAsync(followerId);
                if (follower is not null)
                {
                    follower.FollowingCount += 1;
                }
            }

            if (followedUserId is not null)
            {
                var followed = await db.Users.FindAsync(followedUserId);
                if (followed is not null)
                {
                    followed.FollowersCount += 1;
                }
            }
        }

        await db.SaveChangesAsync();
    }
}
