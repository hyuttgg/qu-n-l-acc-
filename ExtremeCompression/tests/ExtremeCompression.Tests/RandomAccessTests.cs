using ExtremeCompression;
using Xunit;

namespace ExtremeCompression.Tests;

public class RandomAccessTests
{
    [Fact]
    public async Task RandomAccess_ReadBlocksOutOfOrder_MatchesOriginalExactSlices()
    {
        // 3 blocks of 64 KB = 192 KB total
        int blockSize = 64 * 1024;
        byte[] original = new byte[blockSize * 3];

        for (int b = 0; b < 3; b++)
        {
            for (int i = 0; i < blockSize; i++)
            {
                original[b * blockSize + i] = (byte)(b * 70 + (i % 256));
            }
        }

        var options = new CompressionOptions
        {
            ChunkSize = blockSize,
            Parallel = false,
            Level = CompressionLevel.Fast
        };

        using var inMs = new MemoryStream(original);
        using var outMs = new MemoryStream();
        await Compressor.CompressAsync(inMs, outMs, options);

        outMs.Seek(0, SeekOrigin.Begin);

        await using var reader = await Compressor.OpenRandomAccessReaderAsync(outMs);

        // Read out of order: Block 2, then Block 0, then Block 1
        byte[] block2 = await reader.ReadBlockAsync(2);
        byte[] block0 = await reader.ReadBlockAsync(0);
        byte[] block1 = await reader.ReadBlockAsync(1);

        Assert.Equal(original.AsSpan(2 * blockSize, blockSize).ToArray(), block2);
        Assert.Equal(original.AsSpan(0, blockSize).ToArray(), block0);
        Assert.Equal(original.AsSpan(1 * blockSize, blockSize).ToArray(), block1);
    }
}
