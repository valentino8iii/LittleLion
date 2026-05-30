using LittleLion.Api.Endpoints;
using LittleLion.Application;
using LittleLion.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Compose layers
builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration);

// JSON: use camelCase so frontend gets idiomatic property names
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy =
        System.Text.Json.JsonNamingPolicy.CamelCase;
});

builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

// Serve index.html / css / js from wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

// API
app.MapLessonEndpoints();
app.MapProgressEndpoints();
app.MapRewardEndpoints();
app.MapTtsEndpoints();

// Redirect root to the SPA entry point (safety net if UseDefaultFiles misses)
app.MapGet("/", () => Results.Redirect("/index.html"));

app.Run();
