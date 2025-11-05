using FluentValidation;

namespace MochiR.Api.Infrastructure.Validation
{
    internal static class EndpointValidationExtensions
    {
        public static RouteHandlerBuilder AddValidation<TRequest>(this RouteHandlerBuilder builder, string errorCode, string message)
            where TRequest : class
        {
            return builder.AddEndpointFilterFactory((context, next) =>
            {
                return async invocationContext =>
                {
                    var validator = invocationContext.HttpContext.RequestServices.GetService<IValidator<TRequest>>();
                    if (validator is null)
                    {
                        return await next(invocationContext);
                    }

                    var argument = invocationContext.Arguments.FirstOrDefault(arg => arg is TRequest);
                    if (argument is TRequest model)
                    {
                        var result = await validator.ValidateAsync(model, invocationContext.HttpContext.RequestAborted);
                        if (!result.IsValid)
                        {
                            var primaryError = result.Errors.FirstOrDefault();
                            var responseCode = !string.IsNullOrWhiteSpace(primaryError?.ErrorCode)
                                ? primaryError!.ErrorCode
                                : errorCode;
                            var responseMessage = !string.IsNullOrWhiteSpace(primaryError?.ErrorMessage)
                                ? primaryError!.ErrorMessage
                                : message;

                            var details = result.Errors
                                .GroupBy(error => error.PropertyName)
                                .ToDictionary(group => group.Key, group => group.Select(error => error.ErrorMessage).ToArray());

                            return ApiResults.Failure(
                                responseCode,
                                responseMessage,
                                invocationContext.HttpContext,
                                StatusCodes.Status400BadRequest,
                                details);
                        }
                    }

                    return await next(invocationContext);
                };
            });
        }
    }
}
