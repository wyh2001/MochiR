namespace MochiR.Tests;

public sealed class PostgresTestUnavailableException : Exception
{
    public PostgresTestUnavailableException(string message)
        : base(message)
    {
    }

    public PostgresTestUnavailableException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
