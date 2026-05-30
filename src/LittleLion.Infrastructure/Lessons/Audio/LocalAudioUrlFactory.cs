using LittleLion.Application.Lessons.Abstractions;

namespace LittleLion.Infrastructure.Lessons.Audio;

/// <summary>
/// Simple URL factory that points to /audio/{word}.mp3 served from wwwroot.
/// Swap this implementation for an Azure Blob signed-URL variant later
/// without changing any callers.
/// </summary>
public sealed class LocalAudioUrlFactory : IAudioUrlFactory
{
    public string BuildUrl(string word)
    {
        return $"/api/tts?text={Uri.EscapeDataString(word)}";
    }
}
