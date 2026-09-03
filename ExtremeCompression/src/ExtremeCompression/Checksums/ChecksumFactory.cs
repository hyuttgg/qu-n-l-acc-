using ExtremeCompression;

namespace ExtremeCompression.Checksums;

public static class ChecksumFactory
{
    private static readonly Crc32cChecksum Crc32C = new();
    private static readonly Fast64Checksum Fast64 = new();

    public static IChecksum? GetChecksum(ChecksumType type)
    {
        return type switch
        {
            ChecksumType.Crc32c => Crc32C,
            ChecksumType.Fast64 => Fast64,
            _ => null
        };
    }
}
