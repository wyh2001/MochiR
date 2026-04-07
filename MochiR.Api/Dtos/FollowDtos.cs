namespace MochiR.Api.Dtos;

internal sealed record FollowSubjectRelationshipDto(
    int SubjectId,
    bool Following,
    long? FollowId,
    DateTime? FollowedAtUtc);

internal sealed record FollowSubjectTypeRelationshipDto(
    int SubjectTypeId,
    bool Following,
    long? FollowId,
    DateTime? FollowedAtUtc);

internal sealed record FollowUserRelationshipDto(
    string UserId,
    bool Following,
    long? FollowId,
    DateTime? FollowedAtUtc);
