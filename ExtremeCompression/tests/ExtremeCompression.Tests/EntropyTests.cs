using System.Buffers;
using ExtremeCompression.Entropy;
using Xunit;

namespace ExtremeCompression.Tests;

public class EntropyTests
{
    [Fact]
    public void HuffmanCodec_RoundTrip_MatchesOriginal()
    {
        var codec = new HuffmanCodec();
        byte[] original = "ABBCCCDDDDEEEEEFFFFFFGGGGGGGHHHHHHHH"u8.ToArray();

        var writer = new ArrayBufferWriter<byte>();
        codec.Encode(original, writer);

        var decodedWriter = new ArrayBufferWriter<byte>();
        codec.Decode(writer.WrittenSpan, decodedWriter);

        Assert.Equal(original, decodedWriter.WrittenSpan.ToArray());
    }

    [Fact]
    public void RangeCodec_RoundTrip_MatchesOriginal()
    {
        var codec = new RangeCodec();
        byte[] original = "ABBCCCDDDDEEEEEFFFFFFGGGGGGGHHHHHHHH"u8.ToArray();

        var writer = new ArrayBufferWriter<byte>();
        codec.Encode(original, writer);

        var decodedWriter = new ArrayBufferWriter<byte>();
        codec.Decode(writer.WrittenSpan, decodedWriter);

        Assert.Equal(original, decodedWriter.WrittenSpan.ToArray());
    }

    [Fact]
    public void AnsCodec_RoundTrip_MatchesOriginal()
    {
        var codec = new AnsCodec();
        byte[] original = "ABBCCCDDDDEEEEEFFFFFFGGGGGGGHHHHHHHH"u8.ToArray();

        var writer = new ArrayBufferWriter<byte>();
        codec.Encode(original, writer);

        var decodedWriter = new ArrayBufferWriter<byte>();
        codec.Decode(writer.WrittenSpan, decodedWriter);

        Assert.Equal(original, decodedWriter.WrittenSpan.ToArray());
    }
}
