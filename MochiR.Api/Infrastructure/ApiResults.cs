using MochiR.Api.Dtos;

namespace MochiR.Api.Infrastructure
{
    public static class ApiResults
    {
        public static IResult Ok<T>(T data, HttpContext httpContext)
        {
            var payload = ApiResponse.Success(data, httpContext.TraceIdentifier, DateTime.UtcNow);
            return Results.Json(payload, statusCode: StatusCodes.Status200OK);
        }

        public static IResult Created<T>(string location, T data, HttpContext httpContext)
        {
            var payload = ApiResponse.Success(data, httpContext.TraceIdentifier, DateTime.UtcNow);
            return Results.Created(location, payload);
        }

        public static IResult Accepted<T>(string? location, T data, HttpContext httpContext)
        {
            var payload = ApiResponse.Success(data, httpContext.TraceIdentifier, DateTime.UtcNow);
            return Results.Accepted(location, payload);
        }

        public static IResult Success<T>(T data, HttpContext httpContext, int statusCode)
        {
            var payload = ApiResponse.Success(data, httpContext.TraceIdentifier, DateTime.UtcNow);
            return Results.Json(payload, statusCode: statusCode);
        }

        public static IResult Failure(string code, string message, HttpContext httpContext, int statusCode, IReadOnlyDictionary<string, string[]>? details = null)
        {
            var payload = ApiResponse.Failure<object>(code, message, httpContext.TraceIdentifier, DateTime.UtcNow, details);
            return Results.Json(payload, statusCode: statusCode);
        }

        public static IResult Failure(ApiError error, HttpContext httpContext, int statusCode)
        {
            var payload = ApiResponse.Failure<object>(error, httpContext.TraceIdentifier, DateTime.UtcNow);
            return Results.Json(payload, statusCode: statusCode);
        }
    }
}
