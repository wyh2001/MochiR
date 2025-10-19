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

builder.Services.AddDbContext<ApplicationDbContext>(
    options => options.UseInMemoryDatabase("AppDb"));
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
