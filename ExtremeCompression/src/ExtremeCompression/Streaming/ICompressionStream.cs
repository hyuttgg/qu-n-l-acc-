namespace ExtremeCompression.Streaming;

/// <summary>
/// Asynchronous streaming compression and decompression interface for arbitrarily large datasets.
/// </summary>
public interface ICompressionStream
{
    /// <summary>
    /// Compresses an input stream into an output stream using chunked streaming.
    /// </summary>
    ValueTask CompressAsync(
        Stream input,
        Stream output,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Decompresses an input container stream into an output stream.
    /// </summary>
    ValueTask DecompressAsync(
        Stream input,
        Stream output,
        CancellationToken cancellationToken = default);
}
