using System.Buffers;
using System.Threading.Channels;
using ExtremeCompression;
using ExtremeCompression.Container;

namespace ExtremeCompression.Streaming;

/// <summary>
/// High-throughput streaming engine supporting parallel chunk compression and zero-copy block decompression.
/// </summary>
public sealed class CompressionStream : ICompressionStream
{
    private readonly CompressionOptions _options;

    public CompressionStream(CompressionOptions? options = null)
    {
        _options = options ?? CompressionOptions.Default;
    }

    public async ValueTask CompressAsync(Stream input, Stream output, CancellationToken cancellationToken = default)
    {
        var containerWriter = new ContainerWriter(output);
        int chunkSize = _options.ChunkSize > 0 ? _options.ChunkSize : 1024 * 1024;

        await containerWriter.WriteHeaderAsync(chunkSize, cancellationToken).ConfigureAwait(false);

        if (_options.Parallel && _options.MaxDegreeOfParallelism > 1)
        {
            await CompressParallelAsync(input, containerWriter, chunkSize, cancellationToken).ConfigureAwait(false);
        }
        else
        {
            await CompressSequentialAsync(input, containerWriter, chunkSize, cancellationToken).ConfigureAwait(false);
        }

        await containerWriter.FinalizeAsync(cancellationToken).ConfigureAwait(false);
    }

    public async ValueTask DecompressAsync(Stream input, Stream output, CancellationToken cancellationToken = default)
    {
        var containerReader = new ContainerReader(input);
        await containerReader.ReadHeaderAsync(cancellationToken).ConfigureAwait(false);

        while (true)
        {
            BlockHeader? blockHeader = await containerReader.ReadNextBlockHeaderAsync(cancellationToken).ConfigureAwait(false);
            if (blockHeader == null) break;

            if (blockHeader.OriginalSize == 0) continue;

            byte[] compressedBuffer = ArrayPool<byte>.Shared.Rent(blockHeader.CompressedSize);
            byte[] decompressedBuffer = ArrayPool<byte>.Shared.Rent(blockHeader.OriginalSize);

            try
            {
                await ReadExactAsync(input, compressedBuffer.AsMemory(0, blockHeader.CompressedSize), cancellationToken).ConfigureAwait(false);

                int written = CompressionEngine.DecompressBlock(
                    blockHeader,
                    compressedBuffer.AsSpan(0, blockHeader.CompressedSize),
                    decompressedBuffer.AsSpan(0, blockHeader.OriginalSize));

                await output.WriteAsync(decompressedBuffer.AsMemory(0, written), cancellationToken).ConfigureAwait(false);
            }
            finally
            {
                ArrayPool<byte>.Shared.Return(compressedBuffer);
                ArrayPool<byte>.Shared.Return(decompressedBuffer);
            }
        }

        await output.FlushAsync(cancellationToken).ConfigureAwait(false);
    }

    private async Task CompressSequentialAsync(Stream input, ContainerWriter writer, int chunkSize, CancellationToken ct)
    {
        byte[] readBuffer = ArrayPool<byte>.Shared.Rent(chunkSize);
        var blockWriter = new ArrayBufferWriter<byte>(chunkSize);

        try
        {
            while (true)
            {
                int read = await ReadChunkAsync(input, readBuffer.AsMemory(0, chunkSize), ct).ConfigureAwait(false);
                if (read == 0) break;

                blockWriter.Clear();
                BlockHeader header = CompressionEngine.CompressBlock(readBuffer.AsSpan(0, read), blockWriter, _options);

                await writer.WriteBlockAsync(header, blockWriter.WrittenMemory, ct).ConfigureAwait(false);
            }
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(readBuffer);
        }
    }

    private sealed record UncompressedJob(int Index, byte[] Buffer, int Length);
    private sealed record CompressedJobResult(int Index, BlockHeader Header, byte[] Buffer, int Length);

    private async Task CompressParallelAsync(Stream input, ContainerWriter writer, int chunkSize, CancellationToken ct)
    {
        int parallelism = Math.Max(1, _options.MaxDegreeOfParallelism);
        var inputChannel = Channel.CreateBounded<UncompressedJob>(new BoundedChannelOptions(parallelism * 2)
        {
            SingleWriter = true,
            SingleReader = false,
            FullMode = BoundedChannelFullMode.Wait
        });

        var results = new SortedDictionary<int, CompressedJobResult>();
        int nextExpectedBlock = 0;
        int blockCounter = 0;

        // Consumer workers
        var workerTasks = new Task[parallelism];
        var resultChannel = Channel.CreateBounded<CompressedJobResult>(new BoundedChannelOptions(parallelism * 2)
        {
            SingleWriter = false,
            SingleReader = true
        });

        for (int i = 0; i < parallelism; i++)
        {
            workerTasks[i] = Task.Run(async () =>
            {
                var blockWriter = new ArrayBufferWriter<byte>(chunkSize);
                while (await inputChannel.Reader.WaitToReadAsync(ct).ConfigureAwait(false))
                {
                    while (inputChannel.Reader.TryRead(out var job))
                    {
                        blockWriter.Clear();
                        BlockHeader header = CompressionEngine.CompressBlock(job.Buffer.AsSpan(0, job.Length), blockWriter, _options);
                        header.BlockIndex = job.Index;

                        byte[] outCopy = ArrayPool<byte>.Shared.Rent(blockWriter.WrittenCount);
                        blockWriter.WrittenSpan.CopyTo(outCopy);
                        int outLen = blockWriter.WrittenCount;

                        ArrayPool<byte>.Shared.Return(job.Buffer);

                        await resultChannel.Writer.WriteAsync(new CompressedJobResult(job.Index, header, outCopy, outLen), ct).ConfigureAwait(false);
                    }
                }
            }, ct);
        }

        // Writer task to maintain exact order
        var writeTask = Task.Run(async () =>
        {
            while (await resultChannel.Reader.WaitToReadAsync(ct).ConfigureAwait(false))
            {
                while (resultChannel.Reader.TryRead(out var res))
                {
                    results.Add(res.Index, res);

                    while (results.TryGetValue(nextExpectedBlock, out var nextReady))
                    {
                        await writer.WriteBlockAsync(nextReady.Header, nextReady.Buffer.AsMemory(0, nextReady.Length), ct).ConfigureAwait(false);
                        ArrayPool<byte>.Shared.Return(nextReady.Buffer);
                        results.Remove(nextExpectedBlock);
                        nextExpectedBlock++;
                    }
                }
            }
        }, ct);

        // Producer: Read input stream
        while (true)
        {
            byte[] chunkBuf = ArrayPool<byte>.Shared.Rent(chunkSize);
            int read = await ReadChunkAsync(input, chunkBuf.AsMemory(0, chunkSize), ct).ConfigureAwait(false);
            if (read == 0)
            {
                ArrayPool<byte>.Shared.Return(chunkBuf);
                break;
            }

            await inputChannel.Writer.WriteAsync(new UncompressedJob(blockCounter++, chunkBuf, read), ct).ConfigureAwait(false);
        }

        inputChannel.Writer.Complete();
        await Task.WhenAll(workerTasks).ConfigureAwait(false);

        resultChannel.Writer.Complete();
        await writeTask.ConfigureAwait(false);
    }

    private static async ValueTask<int> ReadChunkAsync(Stream stream, Memory<byte> buffer, CancellationToken ct)
    {
        int totalRead = 0;
        while (totalRead < buffer.Length)
        {
            int read = await stream.ReadAsync(buffer.Slice(totalRead), ct).ConfigureAwait(false);
            if (read == 0) break;
            totalRead += read;
        }
        return totalRead;
    }

    private static async ValueTask ReadExactAsync(Stream stream, Memory<byte> buffer, CancellationToken ct)
    {
        int totalRead = 0;
        while (totalRead < buffer.Length)
        {
            int read = await stream.ReadAsync(buffer.Slice(totalRead), ct).ConfigureAwait(false);
            if (read == 0) throw new InvalidDataException("Premature end of stream while reading payload");
            totalRead += read;
        }
    }
}
