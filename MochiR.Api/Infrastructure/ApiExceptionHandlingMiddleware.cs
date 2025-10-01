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
    }

    public static class ApiExceptionHandlingExtensions
    {
        public static IApplicationBuilder UseApiExceptionHandling(this IApplicationBuilder app)
        {
            return app.UseMiddleware<ApiExceptionHandlingMiddleware>();
        }
    }
}
