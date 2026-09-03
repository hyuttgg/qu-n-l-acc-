using ExtremeCompression;
using ExtremeCompression.Entropy;
using ExtremeCompression.Transforms;

namespace ExtremeCompression.Profiling;

/// <summary>
/// Automated configuration optimizer that samples data to select optimal compression parameters.
/// </summary>
public static class AutoTuner
{
    /// <summary>
    /// Evaluates input data to recommend compression configuration.
    /// </summary>
    public static CompressionDecision Tune(ReadOnlySpan<byte> sample, CompressionLevel requestedLevel = CompressionLevel.Balanced)
    {
        var profile = DataProfiler.Profile(sample);
        TransformType suggestedTransform = TransformEngine.SuggestTransform(profile);

        int chunkSize = profile.Length switch
        {
            < 256 * 1024 => 64 * 1024,
            < 2 * 1024 * 1024 => 256 * 1024,
            < 16 * 1024 * 1024 => 1024 * 1024,
            _ => 4 * 1024 * 1024
        };

        // If entropy is extremely high and repetition is near zero, it is likely already compressed
        if (profile.Entropy > 7.85 && profile.RepetitionScore < 0.05)
        {
            return new CompressionDecision
            {
                Level = CompressionLevel.UltraFast,
                ChunkSize = chunkSize,
                DictionarySize = 64 * 1024,
                EstimatedRatio = 1.0,
                EstimatedSpeedMbPerSec = 800.0,
                RecommendedPipeline = "RAW (Data is already high entropy)"
            };
        }

        EntropyCodecType entropy = EntropyCodecSelector.ChooseOptimalCodec(requestedLevel, (int)Math.Min(chunkSize, profile.Length));
        string pipeline = $"Transform={suggestedTransform} -> LZ ({requestedLevel}) -> Entropy={entropy}";

        double estRatio = Math.Clamp(profile.Entropy / 8.0 * (1.0 - profile.RepetitionScore * 0.7), 0.05, 0.98);
        double estSpeed = requestedLevel switch
        {
            CompressionLevel.UltraFast => 350.0,
            CompressionLevel.Fast => 220.0,
            CompressionLevel.Balanced => 110.0,
            CompressionLevel.High => 45.0,
            CompressionLevel.Extreme => 15.0,
            CompressionLevel.Maximum => 5.0,
            _ => 80.0
        };

        return new CompressionDecision
        {
            Level = requestedLevel,
            ChunkSize = chunkSize,
            DictionarySize = MatchConfig.ForLevel(requestedLevel, chunkSize).WindowSize,
            EstimatedRatio = estRatio,
            EstimatedSpeedMbPerSec = estSpeed,
            RecommendedPipeline = pipeline
        };
    }
}
