using System.Text;
using ExtremeCompression;
using Xunit;

namespace ExtremeCompression.Tests;

public class IntegrityAndCorruptionTests
{
    [Fact]
    public void CorruptedPayload_ThrowsInvalidDataException()
    {
        byte[] original = Encoding.UTF8.GetBytes("This is important data that cannot be corrupted or altered! 1234567890.");
        byte[] compressed = Compressor.Compress(original);

        // Corrupt a byte in the payload area (beyond 32-byte header + 28-byte block header)
        int corruptIndex = 65;
        if (corruptIndex < compressed.Length)
        {
            compressed[corruptIndex] ^= 0xFF;
        }

        Assert.Throws<InvalidDataException>(() => Compressor.Decompress(compressed));
    }

    [Fact]
    public void TruncatedContainer_ThrowsInvalidDataException()
    {
        byte[] original = Encoding.UTF8.GetBytes("Data to be truncated into half");
        byte[] compressed = Compressor.Compress(original);

        // Truncate to middle
        byte[] truncated = compressed.AsSpan(0, compressed.Length / 2).ToArray();

        Assert.Throws<InvalidDataException>(() => Compressor.Decompress(truncated));
    }

    [Fact]
    public void InvalidMagicBytes_ThrowsInvalidDataException()
    {
        byte[] original = "Valid string"u8.ToArray();
        byte[] compressed = Compressor.Compress(original);

        // Corrupt magic bytes
        compressed[0] = (byte)'Z';
        compressed[1] = (byte)'Z';

        Assert.Throws<InvalidDataException>(() => Compressor.Decompress(compressed));
    }
}
