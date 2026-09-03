using ExtremeCompression.SIMD;

namespace ExtremeCompression;

/// <summary>
/// High-speed statistical data analyzer classifying input and calculating Shannon entropy.
/// </summary>
public static class DataProfiler
{
    private const int MaxSampleSize = 64 * 1024;

    public static DataProfile Profile(ReadOnlySpan<byte> data)
    {
        if (data.IsEmpty)
        {
            return new DataProfile
            {
                Length = 0,
                Entropy = 0.0,
                UniqueBytes = 0,
                RepetitionScore = 0.0,
                SequentialScore = 0.0,
                Type = DataType.Unknown
            };
        }

        int sampleLength = Math.Min(data.Length, MaxSampleSize);
        ReadOnlySpan<byte> sample = data.Slice(0, sampleLength);

        Span<int> histogram = stackalloc int[256];
        SimdOperations.ComputeByteHistogram(sample, histogram);

        int uniqueBytes = 0;
        double entropy = 0.0;
        double sampleLenDbl = sampleLength;

        for (int b = 0; b < 256; b++)
        {
            int count = histogram[b];
            if (count > 0)
            {
                uniqueBytes++;
                double p = count / sampleLenDbl;
                entropy -= p * Math.Log2(p);
            }
        }

        double repetitionScore = EstimateRepetition(sample);
        double sequentialScore = EstimateSequentiality(sample);
        DataType type = Classify(sample, histogram, entropy, uniqueBytes);

        return new DataProfile
        {
            Length = data.Length,
            Entropy = entropy,
            UniqueBytes = uniqueBytes,
            RepetitionScore = repetitionScore,
            SequentialScore = sequentialScore,
            Type = type
        };
    }

    private static double EstimateRepetition(ReadOnlySpan<byte> sample)
    {
        if (sample.Length < 16) return 0.0;

        int matches = 0;
        int checks = 0;
        Span<ushort> quickTable = stackalloc ushort[1024];

        for (int i = 0; i <= sample.Length - 4; i += 4)
        {
            uint val = System.Runtime.InteropServices.MemoryMarshal.Read<uint>(sample.Slice(i));
            int hash = (int)((val * 0x9E3779B1U) >> 22) & 1023;
            ushort prev = quickTable[hash];
            if (prev != 0 && (i - prev) < 4096)
            {
                matches++;
            }
            quickTable[hash] = (ushort)i;
            checks++;
        }

        return checks == 0 ? 0.0 : Math.Clamp((double)matches / checks, 0.0, 1.0);
    }

    private static double EstimateSequentiality(ReadOnlySpan<byte> sample)
    {
        if (sample.Length < 2) return 0.0;

        int smallDeltas = 0;
        int total = Math.Min(sample.Length - 1, 2048);

        for (int i = 0; i < total; i++)
        {
            int diff = Math.Abs(sample[i + 1] - sample[i]);
            if (diff <= 3)
            {
                smallDeltas++;
            }
        }

        return (double)smallDeltas / total;
    }

    private static DataType Classify(ReadOnlySpan<byte> sample, ReadOnlySpan<int> histogram, double entropy, int uniqueBytes)
    {
        if (sample.Length >= 4)
        {
            if (sample[0] == 0x4D && sample[1] == 0x5A) return DataType.Executable;
            if (sample[0] == 0x7F && sample[1] == (byte)'E' && sample[2] == (byte)'L' && sample[3] == (byte)'F') return DataType.Executable;
            if (sample[0] == 0x89 && sample[1] == 0x50 && sample[2] == 0x4E && sample[3] == 0x47) return DataType.Image;
            if (sample[0] == 0xFF && sample[1] == 0xD8 && sample[2] == 0xFF) return DataType.Image;
            if (sample.Length >= 16 && sample.StartsWith("SQLite format 3"u8)) return DataType.Database;
        }

        int printableCount = 0;
        for (int i = 0x20; i <= 0x7E; i++) printableCount += histogram[i];
        printableCount += histogram[0x09] + histogram[0x0A] + histogram[0x0D];

        double printableRatio = (double)printableCount / sample.Length;

        if (printableRatio > 0.88)
        {
            int braceCount = histogram['{'] + histogram['}'];
            int bracketCount = histogram['['] + histogram[']'];
            int quoteCount = histogram['"'];
            int colonCount = histogram[':'];
            int commaCount = histogram[','];
            int ltCount = histogram['<'];
            int gtCount = histogram['>'];

            if (braceCount >= 2 && quoteCount >= 2 && colonCount >= 1) return DataType.Json;
            if (ltCount >= 2 && gtCount >= 2 && histogram['/'] >= 1) return DataType.Xml;
            if (commaCount > 10 && histogram['\n'] > 2) return DataType.Csv;
            if (sample.IndexOf("[INFO]"u8) >= 0 || sample.IndexOf("[ERROR]"u8) >= 0 || sample.IndexOf("WARN"u8) >= 0) return DataType.Log;

            return DataType.Text;
        }

        if (entropy > 7.7) return DataType.Binary;
        return DataType.Binary;
    }
}
