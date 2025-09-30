namespace MochiR.Api.Dtos
{
    public sealed record ApiError(string Code, string Message, IReadOnlyDictionary<string, string[]>? Details = null);

    public sealed class ApiResponse<T>
    {
        public bool Success { get; init; }
        public T? Data { get; init; }
        public ApiError? Error { get; init; }
        public string TraceId { get; init; } = string.Empty;
        public DateTime TimestampUtc { get; init; }

        private ApiResponse()
        {
        }

        public static ApiResponse<T> SuccessResult(T data, string? traceId = null, DateTime? timestampUtc = null)
        {
            return new ApiResponse<T>
            {
                Success = true,
                Data = data,
                TraceId = traceId ?? string.Empty,
                TimestampUtc = timestampUtc ?? DateTime.UtcNow
            };
        }

        public static ApiResponse<T> FailureResult(ApiError error, string? traceId = null, DateTime? timestampUtc = null)
        {
            return new ApiResponse<T>
            {
                Success = false,
                Error = error,
                TraceId = traceId ?? string.Empty,
                TimestampUtc = timestampUtc ?? DateTime.UtcNow
            };
        }
    }

    public static class ApiResponse
    {
        public static ApiResponse<T> Success<T>(T data, string? traceId = null, DateTime? timestampUtc = null)
        {
            return ApiResponse<T>.SuccessResult(data, traceId, timestampUtc);
        }

        public static ApiResponse<T> Failure<T>(string code, string message, string? traceId = null, DateTime? timestampUtc = null, IReadOnlyDictionary<string, string[]>? details = null)
        {
            return ApiResponse<T>.FailureResult(new ApiError(code, message, details), traceId, timestampUtc);
        }

        public static ApiResponse<T> Failure<T>(ApiError error, string? traceId = null, DateTime? timestampUtc = null)
        {
            return ApiResponse<T>.FailureResult(error, traceId, timestampUtc);
        }
    }
}
