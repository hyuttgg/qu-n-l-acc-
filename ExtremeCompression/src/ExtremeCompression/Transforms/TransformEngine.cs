using ExtremeCompression;

namespace ExtremeCompression.Transforms;

/// <summary>
/// Transform coordinator factory and selector.
/// </summary>
public static class TransformEngine
{
    private static readonly DeltaTransform Delta = new();
    private static readonly ByteShuffleTransform Shuffle2 = new(2);
    private static readonly ByteShuffleTransform Shuffle4 = new(4);
    private static readonly ByteShuffleTransform Shuffle8 = new(8);
    private static readonly RunLengthTransform Rle = new();

    public static ITransformData? GetTransform(TransformType type)
    {
        return type switch
        {
            TransformType.Delta => Delta,
            TransformType.ByteShuffle2 => Shuffle2,
            TransformType.ByteShuffle4 => Shuffle4,
            TransformType.ByteShuffle8 => Shuffle8,
            TransformType.RunLength => Rle,
            _ => null
        };
    }

    /// <summary>
    /// Analyzes data profile to suggest candidate transform, if any.
    /// </summary>
    public static TransformType SuggestTransform(DataProfile profile)
    {
        if (profile.Length < 64)
            return TransformType.None;

        if (profile.RepetitionScore > 0.6)
            return TransformType.RunLength;

        if (profile.SequentialScore > 0.45)
            return TransformType.Delta;

        if (profile.Type == DataType.Database || profile.Type == DataType.Binary)
            return TransformType.ByteShuffle4;

        return TransformType.None;
    }
}
