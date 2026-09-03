using ExtremeCompression;
using ExtremeCompression.Entropy;
using ExtremeCompression.Transforms;

namespace ExtremeCompression.Container;

/// <summary>
/// Metadata describing an individual compressed block within the container.
/// </summary>
public sealed class BlockHeader
{
    public int BlockIndex { get; set; }
    public int CompressedSize { get; set; }
    public int OriginalSize { get; set; }
    public EntropyCodecType Codec { get; set; }
    public TransformType Transform { get; set; }
    public BlockFlags Flags { get; set; }
    public ChecksumType ChecksumType { get; set; }
    public ulong Checksum { get; set; }
    public long PayloadOffset { get; set; }

    public bool IsRaw => (Flags & BlockFlags.IsRaw) != 0;

    public override string ToString() =>
        $"Block[{BlockIndex}]: Orig={OriginalSize}, Comp={CompressedSize}, Codec={Codec}, Transform={Transform}, Raw={IsRaw}, Offset={PayloadOffset}";
}

/// <summary>
/// Root header located at the very start of a KXCP archive.
/// </summary>
public sealed class ContainerHeader
{
    public uint Magic { get; init; } = ContainerConstants.Magic;
    public ushort Version { get; init; } = ContainerConstants.CurrentVersion;
    public ushort Flags { get; init; }
    public int DefaultBlockSize { get; init; }
    public long OriginalTotalSize { get; init; }
    public int BlockCount { get; init; }
    public long BlockTableOffset { get; set; }

    public bool IsValid => Magic == ContainerConstants.Magic && Version <= ContainerConstants.CurrentVersion;
}
