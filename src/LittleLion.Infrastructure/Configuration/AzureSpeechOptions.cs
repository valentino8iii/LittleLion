namespace LittleLion.Infrastructure.Configuration;

public sealed class AzureSpeechOptions
{
    public const string SectionName = "AzureSpeech";

    public string SpeechKey { get; set; } = string.Empty;
    public string SpeechRegion { get; set; } = "eastus";
    public string DefaultVoice { get; set; } = "en-US-AnaNeural";
    public string OutputFormat { get; set; } = "Audio48Khz192KBitRateMonoMp3";
}
