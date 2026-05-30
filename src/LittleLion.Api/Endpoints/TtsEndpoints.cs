using System;
using System.Threading;
using System.Threading.Tasks;
using LittleLion.Application.Lessons.Abstractions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace LittleLion.Api.Endpoints;

public static class TtsEndpoints
{
    public static IEndpointRouteBuilder MapTtsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tts", GetTts)
            .WithName("GetTts")
            .Produces(StatusCodes.Status200OK, typeof(object), "audio/mpeg")
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status500InternalServerError);

        return app;
    }

    private static async Task<IResult> GetTts(
        string text,
        string? rate,
        string? pitch,
        ITextToSpeechService ttsService,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return Results.BadRequest(new { error = "Text parameter is required." });
        }

        try
        {
            var audioBytes = await ttsService.SynthesizeAsync(text, rate, pitch, ct);
            return Results.File(audioBytes, "audio/mpeg");
        }
        catch (Exception ex)
        {
            // Returning 500 triggers the frontend fallback to Web Speech API
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Text-to-speech synthesis failed");
        }
    }
}
