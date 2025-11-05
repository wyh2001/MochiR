using DotNext.Text.Json;
using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MochiR.Api.Endpoints;
using MochiR.Api.Entities;
using MochiR.Api.Infrastructure;
using MochiR.Api.Services.Email;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var useInMemory = builder.Configuration.GetValue("UseInMemory", false);
if (useInMemory)
{
    builder.Services.AddDbContext<ApplicationDbContext>(
        options => options.UseInMemoryDatabase("AppDb"));
}
else
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

    builder.Services.AddDbContext<ApplicationDbContext>(
        options => options.UseNpgsql(connectionString));
}
builder.Services.AddAuthorization();
builder.Services.AddIdentityApiEndpoints<ApplicationUser>(options =>
{
    options.User.RequireUniqueEmail = true;
})
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>();

builder.Services.AddSingleton<IEmailSender, ConsoleEmailSender>();
builder.Services.AddSingleton<IIdentityEmailComposer, DefaultIdentityEmailComposer>();
builder.Services.Configure<IdentityEmailOptions>(builder.Configuration.GetSection("IdentityEmail"));
builder.Services.AddValidatorsFromAssemblyContaining<Program>(includeInternalTypes: true);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new OptionalConverterFactory());
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
});

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseApiExceptionHandling();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
    app.MapIdentityApi<ApplicationUser>();
}

app.MapGet("/", (HttpContext httpContext) =>
    ApiResults.Ok(new { message = "MochiR API is running..." }, httpContext))
    .WithOpenApi()
    .RequireAuthorization();

app.MapAuthEndpoints();
app.MapUsersEndpoints();
app.MapRatingsEndpoints();
app.MapSubjectTypesEndpoints();
app.MapSubjectsEndpoints();
app.MapCriteriaTemplatesEndpoints();
app.MapReviewsEndpoints();

app.Run();

public partial class Program;
