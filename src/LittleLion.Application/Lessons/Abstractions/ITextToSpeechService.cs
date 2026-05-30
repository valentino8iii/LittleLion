using System.Threading;
using System.Threading.Tasks;

namespace LittleLion.Application.Lessons.Abstractions;

/// <summary>
/// Service for synthesizing speech from text.
/// </summary>
public interface ITextToSpeechService
{
    /// <summary>
    /// Synthesizes the specified text into audio bytes (MP3 format).
    /// </summary>
    /// <param name="text">The text to synthesize.</param>
    /// <param name="rate">Optional speech rate (e.g. "0.85" or "+10%").</param>
    /// <param name="pitch">Optional speech pitch (e.g. "+5%").</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Synthesized audio bytes.</returns>
    Task<byte[]> SynthesizeAsync(string text, string? rate, string? pitch, CancellationToken cancellationToken);
}
