namespace ExtremeCompression.Checksums;

/// <summary>
/// Interface for computing block integrity checksums.
/// </summary>
public interface IChecksum
{
    /// <summary>
    /// Computes a 64-bit checksum hash over data.
    /// </summary>
    ulong Compute(ReadOnlySpan<byte> data);
}
