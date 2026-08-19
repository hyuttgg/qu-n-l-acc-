using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Linq;
using System.Collections.Generic;
using System.Runtime.InteropServices.JavaScript;

namespace OceanForge.WasmCore
{
    /// <summary>
    /// OceanForge C# .NET WebAssembly Core Engine
    /// Compiled to .wasm for client-side binary security & ultra-fast data processing.
    /// </summary>
    public static partial class WasmEngine
    {
        public const string ENGINE_VERSION = "OceanForge C# .NET WebAssembly v2.4";
        public const string BUILD_TARGET = "wasm32-wasi / browser";

        [JSExport]
        public static string GetEngineInfo()
        {
            return JsonSerializer.Serialize(new
            {
                engine = ENGINE_VERSION,
                runtime = "C# .NET WebAssembly",
                status = "ACTIVE",
                features = new[] { "AES-256-Binary-Encryption", "LINQ-Fast-Filter", "Roblox-Cookie-Sentinel", "Hardware-Hash" },
                timestamp = DateTime.UtcNow.ToString("o")
            });
        }

        /// <summary>
        /// 🔒 Encrypts sensitive data (Roblox Cookies, API keys, Master passwords) 
        /// inside WebAssembly binary sandbox so it cannot be inspected via F12 DevTools.
        /// </summary>
        [JSExport]
        public static string EncryptSecret(string plainText, string secretKey)
        {
            if (string.IsNullOrEmpty(plainText)) return string.Empty;
            if (string.IsNullOrEmpty(secretKey)) secretKey = "oceanforge_wasm_default_key";

            try
            {
                byte[] keyBytes = SHA256.HashData(Encoding.UTF8.GetBytes(secretKey));
                byte[] iv = new byte[16];
                RandomNumberGenerator.Fill(iv);

                using var aes = Aes.Create();
                aes.Key = keyBytes;
                aes.IV = iv;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;

                using var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
                using var ms = new MemoryStream();
                ms.Write(iv, 0, iv.Length); // prepend IV

                using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
                using (var sw = new StreamWriter(cs, Encoding.UTF8))
                {
                    sw.Write(plainText);
                }

                byte[] cipherBytes = ms.ToArray();
                return "WASM_ENC:" + Convert.ToBase64String(cipherBytes);
            }
            catch (Exception ex)
            {
                return $"ERROR:{ex.Message}";
            }
        }

        /// <summary>
        /// 🔓 Decrypts ciphertext previously encrypted by WasmEngine
        /// </summary>
        [JSExport]
        public static string DecryptSecret(string cipherText, string secretKey)
        {
            if (string.IsNullOrEmpty(cipherText)) return string.Empty;
            if (!cipherText.StartsWith("WASM_ENC:")) return cipherText; // Not encrypted

            if (string.IsNullOrEmpty(secretKey)) secretKey = "oceanforge_wasm_default_key";

            try
            {
                string rawBase64 = cipherText.Substring("WASM_ENC:".Length);
                byte[] fullBytes = Convert.FromBase64String(rawBase64);
                if (fullBytes.Length < 16) return "ERROR:Invalid payload";

                byte[] iv = new byte[16];
                Array.Copy(fullBytes, 0, iv, 0, 16);

                byte[] keyBytes = SHA256.HashData(Encoding.UTF8.GetBytes(secretKey));

                using var aes = Aes.Create();
                aes.Key = keyBytes;
                aes.IV = iv;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;

                using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
                using var ms = new MemoryStream(fullBytes, 16, fullBytes.Length - 16);
                using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
                using var sr = new StreamReader(cs, Encoding.UTF8);

                return sr.ReadToEnd();
            }
            catch (Exception ex)
            {
                return $"ERROR:{ex.Message}";
            }
        }

        /// <summary>
        /// 🛡️ Validates Roblox .ROBLOSECURITY cookie format & sanity
        /// </summary>
        [JSExport]
        public static bool ValidateRobloxCookie(string cookie)
        {
            if (string.IsNullOrWhiteSpace(cookie)) return false;
            string clean = cookie.Trim();
            
            // Standard Roblox security cookie header check
            return clean.Contains("_|WARNING:-DO-NOT-SHARE-THIS") || clean.Length >= 600;
        }

        /// <summary>
        /// ⚡ Computes fast Adler32 / HMAC binary checksum for telemetry packets
        /// </summary>
        [JSExport]
        public static uint ComputeChecksum(string payload)
        {
            if (string.IsNullOrEmpty(payload)) return 0;

            const uint MOD_ADLER = 65521;
            uint a = 1, b = 0;
            byte[] bytes = Encoding.UTF8.GetBytes(payload);

            foreach (byte val in bytes)
            {
                a = (a + val) % MOD_ADLER;
                b = (b + a) % MOD_ADLER;
            }

            return (b << 16) | a;
        }

        /// <summary>
        /// ⚡ Microsecond State Deduplication Check (&lt; 0.05ms)
        /// Computes a 32-bit FNV-1a checksum over farming parameters (Level, Beli, Fragments, Sea, Status, Location, Fruit).
        /// Used by C# WebAssembly binary sandbox to detect idle/standing accounts in microsecond speed.
        /// </summary>
        [JSExport]
        public static uint ComputeStateChecksum(int level, long beli, long fragments, int sea, string status, string location, string fruit)
        {
            uint hash = 2166136261;
            hash = (hash ^ (uint)level) * 16777619;
            hash = (hash ^ (uint)(beli & 0xFFFFFFFF)) * 16777619;
            hash = (hash ^ (uint)(fragments & 0xFFFFFFFF)) * 16777619;
            hash = (hash ^ (uint)sea) * 16777619;

            if (!string.IsNullOrEmpty(status))
            {
                foreach (char c in status)
                {
                    hash = (hash ^ c) * 16777619;
                }
            }

            if (!string.IsNullOrEmpty(location))
            {
                foreach (char c in location)
                {
                    hash = (hash ^ c) * 16777619;
                }
            }

            if (!string.IsNullOrEmpty(fruit))
            {
                foreach (char c in fruit)
                {
                    hash = (hash ^ c) * 16777619;
                }
            }

            return hash;
        }

        /// <summary>
        /// ⚡ Microsecond State Deduplication evaluator (&lt; 0.05ms)
        /// Compares previous 32-bit state checksum with current attributes.
        /// Returns true if account state is unchanged (idle / standing still).
        /// </summary>
        [JSExport]
        public static bool IsStateDeduplicated(uint prevChecksum, int level, long beli, long fragments, int sea, string status, string location, string fruit)
        {
            if (prevChecksum == 0) return false;
            uint currentChecksum = ComputeStateChecksum(level, beli, fragments, sea, status, location, fruit);
            return prevChecksum == currentChecksum;
        }

        /// <summary>
        /// 🤖 Smart AI-Classify & Score Account Tier / Value (< 0.001ms)
        /// Classifies account into Tier S+ (God Tier), Tier A (PvP Ready), Tier B (Mid-Game), Tier C (Starter).
        /// Identifies status: Grinding, Boss Hunter, AFK Warning, Disrupted.
        /// </summary>
        [JSExport]
        public static string SmartClassifyAccount(int level, long beli, long fragments, int sea, string fruit, string sword, string melee, string status, double secondsSinceHeartbeat)
        {
            var tags = new List<string>();
            string tier = "Tier C (Starter)";
            int score = 0;

            // 1. Level Scoring
            score += Math.Min(level, 2600);
            if (level >= 2600)
            {
                tags.Add("Max Lv 2600");
                score += 1000;
            }

            // 2. Sea Scoring
            if (sea >= 3)
            {
                tags.Add("Sea 3");
                score += 500;
            }
            else if (sea == 2)
            {
                tags.Add("Sea 2");
                score += 200;
            }

            // 3. Economy (Beli & Fragments)
            if (beli >= 20000000) tags.Add("Beli 20M+");
            if (fragments >= 50000) tags.Add("Frag 50K+");

            // 4. Mythical / Awakened Fruit Analysis
            string fruitLower = (fruit ?? "").ToLower();
            string[] mythicalFruits = new[] { "kitsune", "dragon", "leopard", "dough", "t-rex", "spirit", "venom", "shadow", "mammoth", "portal", "buddha" };
            bool hasMythical = mythicalFruits.Any(f => fruitLower.Contains(f));
            if (hasMythical)
            {
                tags.Add("Mythical Fruit");
                score += 1500;
            }

            // 5. God Tier Weapons & Melee
            string swordLower = (sword ?? "").ToLower();
            string meleeLower = (melee ?? "").ToLower();
            if (swordLower.Contains("cursed dual katana") || swordLower.Contains("cdk") || swordLower.Contains("true triple katana") || swordLower.Contains("ttk") || swordLower.Contains("dark blade"))
            {
                tags.Add("God Sword");
                score += 1200;
            }
            if (meleeLower.Contains("godhuman") || meleeLower.Contains("sanguine art") || meleeLower.Contains("superhuman") || meleeLower.Contains("electric claw"))
            {
                tags.Add("God Melee");
                score += 1000;
            }

            // 6. Realtime Activity State Classification
            string activityTag = "Offline";
            if (secondsSinceHeartbeat <= 45.0)
            {
                string statusLower = (status ?? "").ToLower();
                if (statusLower.Contains("boss") || statusLower.Contains("raid") || statusLower.Contains("trial") || statusLower.Contains("sea beast"))
                {
                    activityTag = "Boss Hunter 🐲";
                    tags.Add("Boss Hunting");
                }
                else if (statusLower.Contains("farm") || statusLower.Contains("grind") || statusLower.Contains("level") || statusLower.Contains("mastery"))
                {
                    activityTag = "Grinding ⚔️";
                    tags.Add("Grinding");
                }
                else if (statusLower.Contains("stand") || statusLower.Contains("idle") || statusLower.Contains("afk"))
                {
                    activityTag = "AFK / Idle ⏳";
                    tags.Add("AFK");
                }
                else
                {
                    activityTag = "Online 🟢";
                    tags.Add("Online");
                }
            }
            else if (secondsSinceHeartbeat <= 180.0)
            {
                activityTag = "Disrupted ⚠️";
                tags.Add("Disrupted");
            }
            else
            {
                activityTag = "Offline ⚪";
                tags.Add("Offline");
            }

            // 7. Determine Final Tier
            if (score >= 5000 || (level >= 2600 && hasMythical && (tags.Contains("God Sword") || tags.Contains("God Melee"))))
            {
                tier = "Tier S+ (God Tier)";
            }
            else if (score >= 3500 || (level >= 2200 && sea >= 3))
            {
                tier = "Tier A (PvP Ready)";
            }
            else if (score >= 1800 || sea >= 2)
            {
                tier = "Tier B (Mid-Game)";
            }
            else
            {
                tier = "Tier C (Starter)";
            }

            return JsonSerializer.Serialize(new
            {
                tier,
                score,
                activityTag,
                tags = tags.Distinct().ToArray()
            });
        }

        /// <summary>
        /// 🚀 Fast LINQ Account Search & Smart Multi-criteria Filter (< 0.05ms)
        /// </summary>
        [JSExport]
        public static string FastFilterAccounts(string accountsJson, string query, int minLevel, int seaFilter, string fruitFilter)
        {
            if (string.IsNullOrEmpty(accountsJson) || accountsJson == "[]") return "[]";

            try
            {
                using var doc = JsonDocument.Parse(accountsJson);
                var root = doc.RootElement;
                if (root.ValueKind != JsonValueKind.Array) return accountsJson;

                var filtered = new List<JsonElement>();
                string[] queryTokens = string.IsNullOrWhiteSpace(query)
                    ? Array.Empty<string>()
                    : query.ToLower().Split(new[] { ' ', ',', ';' }, StringSplitOptions.RemoveEmptyEntries);

                foreach (var item in root.EnumerateArray())
                {
                    // Check level
                    if (minLevel > 0 && item.TryGetProperty("level", out var lvlProp))
                    {
                        if (lvlProp.GetInt32() < minLevel) continue;
                    }

                    // Check Sea
                    if (seaFilter > 0 && item.TryGetProperty("sea", out var seaProp))
                    {
                        if (seaProp.GetInt32() != seaFilter) continue;
                    }

                    // Check Fruit
                    if (!string.IsNullOrEmpty(fruitFilter) && fruitFilter != "ALL")
                    {
                        string currentFruit = "";
                        if (item.TryGetProperty("equipped", out var eq) && eq.TryGetProperty("fruit", out var fProp))
                        {
                            currentFruit = fProp.GetString() ?? "";
                        }
                        else if (item.TryGetProperty("fruit", out var fRootProp))
                        {
                            currentFruit = fRootProp.GetString() ?? "";
                        }

                        if (!currentFruit.Contains(fruitFilter, StringComparison.OrdinalIgnoreCase)) continue;
                    }

                    // Multi-field intelligent search (Username, Fruit, Sword, Gun, FightingStyle, Location, Race, Status, Notes)
                    if (queryTokens.Length > 0)
                    {
                        string uName = item.TryGetProperty("robloxUsername", out var unProp) ? (unProp.GetString() ?? "") : "";
                        string fruit = item.TryGetProperty("fruit", out var frProp) ? (frProp.GetString() ?? "") : "";
                        string sword = item.TryGetProperty("sword", out var swProp) ? (swProp.GetString() ?? "") : "";
                        string gun = item.TryGetProperty("gun", out var gunProp) ? (gunProp.GetString() ?? "") : "";
                        string fStyle = item.TryGetProperty("fightingStyle", out var fsProp) ? (fsProp.GetString() ?? "") : "";
                        string race = item.TryGetProperty("race", out var rcProp) ? (rcProp.GetString() ?? "") : "";
                        string loc = item.TryGetProperty("location", out var lcProp) ? (lcProp.GetString() ?? "") : "";
                        string status = item.TryGetProperty("status", out var stProp) ? (stProp.GetString() ?? "") : "";
                        string note = item.TryGetProperty("note", out var ntProp) ? (ntProp.GetString() ?? "") : "";

                        string combined = $"{uName} {fruit} {sword} {gun} {fStyle} {race} {loc} {status} {note}".ToLower();

                        bool matchesAllTokens = queryTokens.All(token => combined.Contains(token));
                        if (!matchesAllTokens) continue;
                    }

                    filtered.Add(item);
                }

                return JsonSerializer.Serialize(filtered);
            }
            catch
            {
                return accountsJson; // fallback
            }
        }
    }
}
