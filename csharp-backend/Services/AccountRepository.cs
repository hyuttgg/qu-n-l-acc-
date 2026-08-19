using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Dapper;
using OceanForge.BackendEngine.Services;

namespace OceanForge.BackendEngine.Models
{
    public class UserEntity
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public string Role { get; set; } = "Member";
        public string? Nickname { get; set; }
        public string? UserCode { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; }
        public DateTime LastLogin { get; set; }
    }

    public class AccountEntity
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string RobloxUsername { get; set; } = string.Empty;
        public int Level { get; set; } = 1;
        public long Beli { get; set; } = 0;
        public long Fragments { get; set; } = 0;
        public int Sea { get; set; } = 1;
        public string Race { get; set; } = "Human";
        public string Fruit { get; set; } = "None";
        public int FruitMastery { get; set; } = 0;
        public string Sword { get; set; } = "None";
        public string Gun { get; set; } = "None";
        public string FightingStyle { get; set; } = "Combat";
        public string Accessory { get; set; } = "None";
        public string Status { get; set; } = "idle";
        public string Location { get; set; } = "Starter Island";
        public int PlaytimeSeconds { get; set; } = 0;
        public DateTime LastHeartbeat { get; set; }
        public bool IsOnline { get; set; } = false;
        public DateTime CreatedAt { get; set; }
    }
}

namespace OceanForge.BackendEngine.Services
{
    public class AccountRepository
    {
        private readonly MySqlDatabaseService _db;

        public AccountRepository(MySqlDatabaseService db)
        {
            _db = db;
        }

        // ───── 1. Query Account by Roblox Username ─────
        public async Task<Models.AccountEntity?> GetByRobloxUsernameAsync(string robloxUsername)
        {
            const string sql = @"
                SELECT id, user_id AS UserId, roblox_username AS RobloxUsername, level, beli, fragments, 
                       sea, race, fruit, fruit_mastery AS FruitMastery, sword, gun, fighting_style AS FightingStyle, 
                       accessory, status, location, playtime_seconds AS PlaytimeSeconds, 
                       last_heartbeat AS LastHeartbeat, is_online AS IsOnline, created_at AS CreatedAt
                FROM accounts 
                WHERE roblox_username = @RobloxUsername 
                LIMIT 1;";

            using var conn = _db.CreateConnection();
            return await conn.QueryFirstOrDefaultAsync<Models.AccountEntity>(sql, new { RobloxUsername = robloxUsername });
        }

        // ───── 2. Upsert (Insert or Update) Telemetry Data ─────
        public async Task<int> UpsertAccountAsync(Models.AccountEntity account)
        {
            const string sql = @"
                INSERT INTO accounts (
                    user_id, roblox_username, level, beli, fragments, sea, race, 
                    fruit, fruit_mastery, sword, gun, fighting_style, accessory, 
                    status, location, playtime_seconds, last_heartbeat, is_online
                ) VALUES (
                    @UserId, @RobloxUsername, @Level, @Beli, @Fragments, @Sea, @Race, 
                    @Fruit, @FruitMastery, @Sword, @Gun, @FightingStyle, @Accessory, 
                    @Status, @Location, @PlaytimeSeconds, NOW(), @IsOnline
                )
                ON DUPLICATE KEY UPDATE 
                    level = VALUES(level),
                    beli = VALUES(beli),
                    fragments = VALUES(fragments),
                    sea = VALUES(sea),
                    race = VALUES(race),
                    fruit = VALUES(fruit),
                    fruit_mastery = VALUES(fruit_mastery),
                    sword = VALUES(sword),
                    gun = VALUES(gun),
                    fighting_style = VALUES(fighting_style),
                    accessory = VALUES(accessory),
                    status = VALUES(status),
                    location = VALUES(location),
                    playtime_seconds = playtime_seconds + VALUES(playtime_seconds),
                    last_heartbeat = NOW(),
                    is_online = VALUES(is_online);";

            using var conn = _db.CreateConnection();
            return await conn.ExecuteAsync(sql, account);
        }

        // ───── 3. Query All Accounts of a User ─────
        public async Task<IEnumerable<Models.AccountEntity>> GetUserAccountsAsync(int userId)
        {
            const string sql = @"
                SELECT id, user_id AS UserId, roblox_username AS RobloxUsername, level, beli, fragments, 
                       sea, race, fruit, fruit_mastery AS FruitMastery, sword, gun, fighting_style AS FightingStyle, 
                       accessory, status, location, playtime_seconds AS PlaytimeSeconds, 
                       last_heartbeat AS LastHeartbeat, is_online AS IsOnline, created_at AS CreatedAt
                FROM accounts 
                WHERE user_id = @UserId
                ORDER BY is_online DESC, level DESC;";

            using var conn = _db.CreateConnection();
            return await conn.QueryAsync<Models.AccountEntity>(sql, new { UserId = userId });
        }
    }
}
