using System.Buffers;
using ExtremeCompression.Checksums;
using ExtremeCompression;
using ExtremeCompression.Container;
using ExtremeCompression.Entropy;
using ExtremeCompression.Matching;
using ExtremeCompression.Profiling;
using ExtremeCompression.Transforms;

namespace ExtremeCompression;

/// <summary>
/// Core block-level compression engine. Adapts transforms, dictionary matching,
/// and entropy coding per block with automatic expansion rollback to RAW.
/// </summary>
public static class CompressionEngine
{
    /// <summary>
    /// Compresses a single block into outputWriter and generates its BlockHeader descriptor.
    /// </summary>
    public static BlockHeader CompressBlock(
        ReadOnlySpan<byte> input,
        IBufferWriter<byte> outputWriter,
        CompressionOptions options)
    {
        int originalSize = input.Length;

        // 1. Calculate integrity checksum
        IChecksum? checksumCalc = ChecksumFactory.GetChecksum(options.Checksum);
        ulong checksum = checksumCalc?.Compute(input) ?? 0;

        if (originalSize == 0)
        {
            return new BlockHeader
            {
                CompressedSize = 0,
                OriginalSize = 0,
                Codec = EntropyCodecType.Raw,
                Transform = TransformType.None,
                Flags = BlockFlags.IsRaw | (checksumCalc != null ? BlockFlags.HasChecksum : BlockFlags.None),
                ChecksumType = options.Checksum,
                Checksum = checksum
            };
        }

        // 2. Profile block
        DataProfile profile = DataProfiler.Profile(input);

        // Fast path for incompressible high-entropy blocks
        if (profile.Entropy > 7.9 && profile.RepetitionScore < 0.02)
        {
            return EmitRawBlock(input, outputWriter, options.Checksum, checksum);
        }

        // 3. Transform layer
        TransformType chosenTransform = TransformType.None;
        byte[]? transformRent = null;
        ReadOnlySpan<byte> lzInput = input;

        if (options.EnableTransforms)
        {
            chosenTransform = TransformEngine.SuggestTransform(profile);
            if (chosenTransform != TransformType.None)
            {
                ITransformData? transform = TransformEngine.GetTransform(chosenTransform);
                if (transform != null)
                {
                    transformRent = ArrayPool<byte>.Shared.Rent(originalSize * 2 + 512);
                    try
                    {
                        int transformedLen = transform.Transform(input, transformRent);
                        lzInput = transformRent.AsSpan(0, transformedLen);
                    }
                    catch
                    {
                        // Fallback to untransformed input on any issue
                        chosenTransform = TransformType.None;
                        lzInput = input;
                    }
                }
            }
        }

        // 4. LZ Dictionary matching layer
        var matchConfig = MatchConfig.ForLevel(options.Level, lzInput.Length);
        var dictEncoder = new DictionaryEncoder(matchConfig);

        var lzBuffer = new ArrayBufferWriter<byte>(lzInput.Length);
        dictEncoder.Encode(lzInput, lzBuffer);

        ReadOnlySpan<byte> entropyInput = lzBuffer.WrittenSpan;

        // 5. Entropy coding layer
        EntropyCodecType chosenCodec = EntropyCodecType.Raw;
        var finalBuffer = new ArrayBufferWriter<byte>(entropyInput.Length);

        if (options.EnableEntropyCoding)
        {
            chosenCodec = EntropyCodecSelector.ChooseOptimalCodec(options.Level, entropyInput.Length);
            IEntropyCodec? codec = EntropyCodecSelector.GetCodec(chosenCodec);

            if (codec != null)
            {
                try
                {
                    codec.Encode(entropyInput, finalBuffer);
                }
                catch
                {
                    // Fallback to RAW entropy if codec encounters anomalies
                    chosenCodec = EntropyCodecType.Raw;
                    finalBuffer.Clear();
                }
            }
        }

        ReadOnlySpan<byte> candidateOutput = chosenCodec == EntropyCodecType.Raw
            ? entropyInput
            : finalBuffer.WrittenSpan;

        // 6. Block Adaptation & Expansion Detection
        // If compressed size is >= original size, discard compressed representation and store RAW!
        if (candidateOutput.Length >= originalSize)
        {
            if (transformRent != null) ArrayPool<byte>.Shared.Return(transformRent);
            return EmitRawBlock(input, outputWriter, options.Checksum, checksum);
        }

        // Emit compressed payload
        Span<byte> outSpan = outputWriter.GetSpan(candidateOutput.Length);
        candidateOutput.CopyTo(outSpan);
        outputWriter.Advance(candidateOutput.Length);

        if (transformRent != null) ArrayPool<byte>.Shared.Return(transformRent);

        BlockFlags flags = BlockFlags.None;
        if (checksumCalc != null) flags |= BlockFlags.HasChecksum;
        if (chosenTransform != TransformType.None) flags |= BlockFlags.HasTransform;
        if (chosenCodec != EntropyCodecType.Raw) flags |= BlockFlags.HasEntropy;

        return new BlockHeader
        {
            CompressedSize = candidateOutput.Length,
            OriginalSize = originalSize,
            Codec = chosenCodec,
            Transform = chosenTransform,
            Flags = flags,
            ChecksumType = options.Checksum,
            Checksum = checksum
        };
    }

    /// <summary>
    /// Decompresses a single block payload back to original bytes with checksum integrity verification.
    /// </summary>
    public static int DecompressBlock(
        BlockHeader header,
        ReadOnlySpan<byte> compressedPayload,
        Span<byte> destination)
    {
        if (header.OriginalSize == 0) return 0;
        if (destination.Length < header.OriginalSize)
            throw new ArgumentException("Destination buffer too small", nameof(destination));

        // 1. RAW block fast path
        if (header.IsRaw)
        {
            if (compressedPayload.Length < header.OriginalSize)
                throw new InvalidDataException("Truncated RAW block payload");

            compressedPayload.Slice(0, header.OriginalSize).CopyTo(destination);
            VerifyChecksum(header, destination.Slice(0, header.OriginalSize));
            return header.OriginalSize;
        }

        // 2. Entropy decode layer
        ReadOnlySpan<byte> lzPayload = compressedPayload;
        byte[]? entropyRent = null;

        if (header.Codec != EntropyCodecType.Raw)
        {
            IEntropyCodec? codec = EntropyCodecSelector.GetCodec(header.Codec);
            if (codec == null)
                throw new NotSupportedException($"Unsupported entropy codec: {header.Codec}");

            var lzWriter = new ArrayBufferWriter<byte>(header.OriginalSize * 2);
            codec.Decode(compressedPayload, lzWriter);
            lzPayload = lzWriter.WrittenSpan;
        }

        // 3. Dictionary decode layer
        byte[]? lzDecodedRent = null;
        Span<byte> targetAfterLz;

        if (header.Transform == TransformType.None)
        {
            targetAfterLz = destination.Slice(0, header.OriginalSize);
        }
        else
        {
            lzDecodedRent = ArrayPool<byte>.Shared.Rent(header.OriginalSize * 2 + 512);
            targetAfterLz = lzDecodedRent.AsSpan(0, header.OriginalSize);
        }

        try
        {
            int lzWritten = DictionaryDecoder.Decode(lzPayload, targetAfterLz);

            // 4. Inverse transform layer
            if (header.Transform != TransformType.None)
            {
                ITransformData? transform = TransformEngine.GetTransform(header.Transform);
                if (transform == null)
                    throw new NotSupportedException($"Unsupported transform: {header.Transform}");

                transform.InverseTransform(targetAfterLz.Slice(0, lzWritten), destination.Slice(0, header.OriginalSize));
            }

            // 5. Verify integrity checksum
            VerifyChecksum(header, destination.Slice(0, header.OriginalSize));

            return header.OriginalSize;
        }
        finally
        {
            if (lzDecodedRent != null) ArrayPool<byte>.Shared.Return(lzDecodedRent);
        }
    }

    private static BlockHeader EmitRawBlock(ReadOnlySpan<byte> input, IBufferWriter<byte> outputWriter, ChecksumType checksumType, ulong checksum)
    {
        Span<byte> span = outputWriter.GetSpan(input.Length);
        input.CopyTo(span);
        outputWriter.Advance(input.Length);

        return new BlockHeader
        {
            CompressedSize = input.Length,
            OriginalSize = input.Length,
            Codec = EntropyCodecType.Raw,
            Transform = TransformType.None,
            Flags = BlockFlags.IsRaw | (checksumType != ChecksumType.None ? BlockFlags.HasChecksum : BlockFlags.None),
            ChecksumType = checksumType,
            Checksum = checksum
        };
    }

    private static void VerifyChecksum(BlockHeader header, ReadOnlySpan<byte> data)
    {
        if ((header.Flags & BlockFlags.HasChecksum) == 0 || header.ChecksumType == ChecksumType.None)
            return;

        IChecksum? calc = ChecksumFactory.GetChecksum(header.ChecksumType);
        if (calc != null)
        {
            ulong computed = calc.Compute(data);
            if (computed != header.Checksum)
            {
                throw new InvalidDataException(
                    $"Block {header.BlockIndex} checksum mismatch! Computed=0x{computed:X16}, Expected=0x{header.Checksum:X16}");
            }
        }
    }
}
