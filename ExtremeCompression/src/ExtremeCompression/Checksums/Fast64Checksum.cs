using System.IO.Hashing;

namespace ExtremeCompression.Checksums;

/// <summary>
/// High-speed 64-bit non-cryptographic checksum utilizing XXH3 algorithm.
/// </summary>
public sealed class Fast64Checksum : IChecksum
{
    public ulong Compute(ReadOnlySpan<byte> data)
    {
        return XxHash3.HashToUInt64(data);
    }
}
