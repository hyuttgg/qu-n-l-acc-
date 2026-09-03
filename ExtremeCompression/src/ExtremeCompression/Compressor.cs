// Namespace references
using ExtremeCompression.Streaming;

namespace ExtremeCompression;

/// <summary>
/// Primary entry point for high-performance lossless compression and decompression.
/// </summary>
public static class Compressor
{
    /// <summary>
    /// Compresses input stream into destination stream asynchronously.
    /// </summary>
    public static async ValueTask CompressAsync(
        Stream input,
        Stream output,
        CompressionOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        var stream = new CompressionStream(options);
        await stream.CompressAsync(input, output, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Decompresses KXCP container stream into destination stream asynchronously.
    /// </summary>
    public static async ValueTask DecompressAsync(
        Stream input,
        Stream output,
        CompressionOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        var stream = new CompressionStream(options);
        await stream.DecompressAsync(input, output, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Compresses an in-memory byte buffer into a KXCP container.
    /// </summary>
    public static byte[] Compress(ReadOnlySpan<byte> input, CompressionOptions? options = null)
    {
        using var inMs = new MemoryStream(input.ToArray(), writable: false);
        using var outMs = new MemoryStream();
        CompressAsync(inMs, outMs, options).GetAwaiter().GetResult();
        return outMs.ToArray();
    }

    /// <summary>
    /// Decompresses an in-memory KXCP container back to original uncompressed bytes.
    /// </summary>
    public static byte[] Decompress(ReadOnlySpan<byte> compressed, CompressionOptions? options = null)
    {
        using var inMs = new MemoryStream(compressed.ToArray(), writable: false);
        using var outMs = new MemoryStream();
        DecompressAsync(inMs, outMs, options).GetAwaiter().GetResult();
        return outMs.ToArray();
    }

    /// <summary>
    /// Opens a random-access reader on a seekable compressed stream to read blocks independently.
    /// </summary>
    public static async ValueTask<RandomAccessBlockReader> OpenRandomAccessReaderAsync(
        Stream seekableStream,
        CancellationToken cancellationToken = default)
    {
        var reader = new RandomAccessBlockReader(seekableStream);
        await reader.InitializeAsync(cancellationToken).ConfigureAwait(false);
        return reader;
    }
}
