using System.Text.Json;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.Options;
using MochiR.Api.Dtos;

namespace MochiR.Api.Infrastructure
{
    public sealed class ApiExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ApiExceptionHandlingMiddleware> logger,
        IOptions<JsonOptions> jsonOptions)
    {
        private const string DefaultErrorCode = "INTERNAL_SERVER_ERROR";
        private const string DefaultErrorMessage = "The server is busy. Please try again later.";
        private const string DefaultInvalidPayloadCode = "INVALID_REQUEST_BODY";
        private const string DefaultInvalidPayloadMessage = "The request body is malformed.";

        private readonly RequestDelegate _next = next;
        private readonly ILogger<ApiExceptionHandlingMiddleware> _logger = logger;
        private readonly JsonSerializerOptions _serializerOptions = jsonOptions.Value.SerializerOptions;

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
            {
                // When the client cancels the request, do not treat it as a server error.
            }
            catch (BadHttpRequestException ex)
            {
                if (context.Response.HasStarted)
                {
                    _logger.LogError(ex, "Response has already started when handling an invalid JSON payload.");
                    throw;
                }

                var metadata = context.GetEndpoint()?.Metadata.GetMetadata<InvalidPayloadMetadata>();
                var errorCode = metadata?.ErrorCode ?? DefaultInvalidPayloadCode;
                var message = metadata?.Message ?? DefaultInvalidPayloadMessage;

                _logger.LogWarning(ex, "Invalid JSON payload received for endpoint {Endpoint}", context.GetEndpoint()?.DisplayName);
                await WriteInvalidPayloadAsync(context, errorCode, message);
            }
            catch (Exception ex)
            {
                if (context.Response.HasStarted)
                {
                    _logger.LogError(ex, "Response has already started when handling an unhandled exception.");
                    throw;
                }

                _logger.LogError(ex, "Unhandled exception encountered.");
                await WriteFailureAsync(context);
            }
        }

        private async Task WriteFailureAsync(HttpContext context)
        {
            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json; charset=utf-8";

            var payload = ApiResponse.Failure<object>(
                DefaultErrorCode,
                DefaultErrorMessage,
                context.TraceIdentifier,
                DateTime.UtcNow);

            await context.Response.WriteAsJsonAsync(payload, _serializerOptions, context.RequestAborted);
        }

        private async Task WriteInvalidPayloadAsync(HttpContext context, string errorCode, string message)
        {
            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/json; charset=utf-8";

            var payload = ApiResponse.Failure<object>(
                errorCode,
                message,
                context.TraceIdentifier,
                DateTime.UtcNow);

            await context.Response.WriteAsJsonAsync(payload, _serializerOptions, context.RequestAborted);
        }
    }

    public static class ApiExceptionHandlingExtensions
    {
        public static IApplicationBuilder UseApiExceptionHandling(this IApplicationBuilder app)
        {
            return app.UseMiddleware<ApiExceptionHandlingMiddleware>();
        }
    }

    public sealed record InvalidPayloadMetadata(string ErrorCode, string Message);
}
