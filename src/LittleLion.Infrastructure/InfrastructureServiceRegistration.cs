using LittleLion.Application.Common;
using LittleLion.Application.Lessons.Abstractions;
using LittleLion.Application.Progress.Abstractions;
using LittleLion.Application.Rewards.Abstractions;
using LittleLion.Infrastructure.Configuration;
using LittleLion.Infrastructure.Lessons.Audio;
using LittleLion.Infrastructure.Lessons.Persistence;
using LittleLion.Infrastructure.Progress.Persistence;
using LittleLion.Infrastructure.Rewards.Persistence;
using LittleLion.Infrastructure.Time;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LittleLion.Infrastructure;

/// <summary>
/// Composition of Infrastructure services. Called once from API's Program.cs.
/// </summary>
public static class InfrastructureServiceRegistration
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Options
        services.Configure<LessonStorageOptions>(
            configuration.GetSection(LessonStorageOptions.SectionName));
        services.Configure<ProgressStorageOptions>(
            configuration.GetSection(ProgressStorageOptions.SectionName));
        services.Configure<RewardCatalogOptions>(
            configuration.GetSection(RewardCatalogOptions.SectionName));
        services.Configure<AzureSpeechOptions>(
            configuration.GetSection(AzureSpeechOptions.SectionName));

        // HttpClient and TTS
        services.AddSingleton<System.Net.Http.HttpClient>();
        services.AddSingleton<ITextToSpeechService, AzureTextToSpeechService>();

        // Lessons - singleton because lessons.json is static
        services.AddSingleton<ILessonRepository, JsonFileLessonRepository>();
        services.AddSingleton<IAudioUrlFactory, LocalAudioUrlFactory>();

        // Progress - singleton so the SemaphoreSlim serializes writes across requests
        services.AddSingleton<IProgressRepository, JsonFileProgressRepository>();

        // Rewards - catalog is static content, singleton is fine
        services.AddSingleton<IRewardCatalog, JsonFileRewardCatalog>();

        // Clock
        services.AddSingleton<IClock, SystemClock>();

        return services;
    }
}
