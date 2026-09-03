using ExtremeCompression.Transforms;
using Xunit;

namespace ExtremeCompression.Tests;

public class TransformsTests
{
    [Fact]
    public void DeltaTransform_IsExactReversible()
    {
        var delta = new DeltaTransform();
        byte[] original = new byte[1024];
        for (int i = 0; i < original.Length; i++) original[i] = (byte)(i * 3 + 10);

        byte[] transformed = new byte[1024];
        byte[] inverted = new byte[1024];

        delta.Transform(original, transformed);
        delta.InverseTransform(transformed, inverted);

        Assert.Equal(original, inverted);
    }

    [Theory]
    [InlineData(2)]
    [InlineData(4)]
    [InlineData(8)]
    public void ByteShuffleTransform_IsExactReversible(int stride)
    {
        var shuffle = new ByteShuffleTransform(stride);
        byte[] original = new byte[1007]; // Non-multiple of stride to test unaligned tail
        new Random(123).NextBytes(original);

        byte[] transformed = new byte[original.Length];
        byte[] inverted = new byte[original.Length];

        shuffle.Transform(original, transformed);
        shuffle.InverseTransform(transformed, inverted);

        Assert.Equal(original, inverted);
    }

    [Fact]
    public void RunLengthTransform_IsExactReversible()
    {
        var rle = new RunLengthTransform();
        var originalList = new List<byte>();
        for (int i = 0; i < 50; i++) originalList.Add((byte)'A');
        for (int i = 0; i < 3; i++) originalList.Add((byte)'B');
        for (int i = 0; i < 100; i++) originalList.Add((byte)'C');
        for (int i = 0; i < 265; i++) originalList.Add((byte)'D'); // exceeds 259 run length limit

        byte[] original = originalList.ToArray();
        byte[] transformed = new byte[original.Length * 2 + 64];
        byte[] inverted = new byte[original.Length * 2 + 64];

        int tLen = rle.Transform(original, transformed);
        int invLen = rle.InverseTransform(transformed.AsSpan(0, tLen), inverted);

        Assert.Equal(original.Length, invLen);
        Assert.Equal(original, inverted.AsSpan(0, invLen).ToArray());
    }
}
