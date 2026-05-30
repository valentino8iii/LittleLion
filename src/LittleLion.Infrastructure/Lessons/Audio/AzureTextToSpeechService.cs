using System;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using LittleLion.Application.Lessons.Abstractions;
using LittleLion.Infrastructure.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LittleLion.Infrastructure.Lessons.Audio;

public sealed class AzureTextToSpeechService : ITextToSpeechService
{
    private readonly HttpClient _httpClient;
    private readonly AzureSpeechOptions _options;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<AzureTextToSpeechService> _logger;

    private static readonly SemaphoreSlim CacheLock = new(1, 1);

    public AzureTextToSpeechService(
        HttpClient httpClient,
        IOptions<AzureSpeechOptions> options,
        IHostEnvironment environment,
        ILogger<AzureTextToSpeechService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _environment = environment;
        _logger = logger;
    }

    public async Task<byte[]> SynthesizeAsync(string text, string? rate, string? pitch, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return Array.Empty<byte>();
        }

        // Generate cache key based on text, rate, pitch
        var key = $"{text.Trim()}|{rate ?? "default"}|{pitch ?? "default"}";
        string hexHash;
        using (var sha256 = SHA256.Create())
        {
            var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(key));
            hexHash = Convert.ToHexString(hashBytes);
        }

        var cachePath = Path.Combine(_environment.ContentRootPath, "Data", "AudioCache", $"{hexHash}.mp3");

        // 1. Check if cached file exists
        if (File.Exists(cachePath))
        {
            _logger.LogDebug("Cache hit for TTS: {Text}", text);
            return await File.ReadAllBytesAsync(cachePath, cancellationToken);
        }

        // 2. Synthesize and cache
        await CacheLock.WaitAsync(cancellationToken);
        try
        {
            // Double check inside the lock
            if (File.Exists(cachePath))
            {
                return await File.ReadAllBytesAsync(cachePath, cancellationToken);
            }

            _logger.LogInformation("Cache miss. Synthesizing TTS from Azure for: {Text}", text);
            var audioBytes = await CallAzureSpeechApiAsync(text, rate, pitch, cancellationToken);

            var directory = Path.GetDirectoryName(cachePath);
            if (directory != null && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            await File.WriteAllBytesAsync(cachePath, audioBytes, cancellationToken);
            return audioBytes;
        }
        finally
        {
            CacheLock.Release();
        }
    }

    private async Task<byte[]> CallAzureSpeechApiAsync(string text, string? rate, string? pitch, CancellationToken cancellationToken)
    {
        var endpoint = $"https://{_options.SpeechRegion}.tts.speech.microsoft.com/cognitiveservices/v1";
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);

        request.Headers.Add("Ocp-Apim-Subscription-Key", _options.SpeechKey);
        request.Headers.Add("User-Agent", "LittleLionApi");
        request.Headers.Add("X-Microsoft-OutputFormat", NormalizeOutputFormat(_options.OutputFormat));

        // Escape XML characters
        string escapedText = System.Security.SecurityElement.Escape(text);

        // Parse pitch
        string pitchAttr = "0%";
        if (!string.IsNullOrEmpty(pitch))
        {
            if (double.TryParse(pitch, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out double pitchVal))
            {
                // Scale browser pitch to neural voice friendly percentage
                // pitch = 1.45 -> (1.45 - 1.0) * 100 / 4 = +11.25%
                double pct = (pitchVal - 1.0) * 100.0 / 4.0;
                string sign = pct >= 0 ? "+" : "";
                pitchAttr = $"{sign}{pct.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture)}%";
            }
            else
            {
                pitchAttr = pitch;
            }
        }

        // Parse rate
        string rateAttr = "1.0";
        if (!string.IsNullOrEmpty(rate))
        {
            if (double.TryParse(rate, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out double rateVal))
            {
                rateAttr = rateVal.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture);
            }
            else
            {
                rateAttr = rate;
            }
        }

        string ssml = $"""
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
          <voice name="{_options.DefaultVoice}">
            <prosody rate="{rateAttr}" pitch="{pitchAttr}">
              {escapedText}
            </prosody>
          </voice>
        </speak>
        """;

        request.Content = new StringContent(ssml, Encoding.UTF8, "application/ssml+xml");

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Azure Speech API error response: {Status} - {Error}", response.StatusCode, error);
            throw new HttpRequestException($"Azure Speech API call failed with status {response.StatusCode}");
        }

        return await response.Content.ReadAsByteArrayAsync(cancellationToken);
    }

    private static string NormalizeOutputFormat(string format)
    {
        if (string.IsNullOrWhiteSpace(format))
        {
            return "audio-16khz-128kbitrate-mono-mp3";
        }

        if (format.Equals("Audio48Khz192KBitRateMonoMp3", StringComparison.OrdinalIgnoreCase))
            return "audio-48khz-192kbitrate-mono-mp3";
        if (format.Equals("Audio24Khz160KBitRateMonoMp3", StringComparison.OrdinalIgnoreCase))
            return "audio-24khz-160kbitrate-mono-mp3";
        if (format.Equals("Audio16Khz128KBitRateMonoMp3", StringComparison.OrdinalIgnoreCase))
            return "audio-16khz-128kbitrate-mono-mp3";
        if (format.Equals("Audio24Khz48KBitRateMonoMp3", StringComparison.OrdinalIgnoreCase))
            return "audio-24khz-48kbitrate-mono-mp3";

        if (format.Contains('-'))
        {
            return format.ToLowerInvariant();
        }

        return format.ToLowerInvariant()
            .Replace("audio", "audio-")
            .Replace("khz", "khz-")
            .Replace("kbitrate", "kbitrate-")
            .Replace("mono", "mono-")
            .Replace("mp3", "mp3")
            .Replace("--", "-")
            .Trim('-');
    }
}
