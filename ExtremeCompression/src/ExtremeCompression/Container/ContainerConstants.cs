namespace ExtremeCompression.Container;

public static class ContainerConstants
{
    /// <summary>Magic bytes "KXCP" (0x5043584B little endian).</summary>
    public const uint Magic = 0x5043584B;

    /// <summary>Container specification version 1.</summary>
    public const ushort CurrentVersion = 1;

    public const int HeaderSize = 32;
    public const int BlockEntrySize = 28;
}

[Flags]
public enum BlockFlags : byte
{
    None = 0,
    IsRaw = 1 << 0,
    HasChecksum = 1 << 1,
    HasTransform = 1 << 2,
    HasEntropy = 1 << 3
}
