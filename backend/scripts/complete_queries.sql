-- ===================================================================
-- 🚀 OCEANFORGE / BLOX FRUITS ACCOUNT MANAGER — COMPLETE MYSQL SUITE
-- Full DDL Schema, Views, Stored Procedures, Triggers & DML Queries
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ===================================================================

CREATE DATABASE IF NOT EXISTS `bloxfruits_db` 
    DEFAULT CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE `bloxfruits_db`;

-- ═══════════════════════════════════════════════════════════════════
-- 1. DDL: TABLE DEFINITIONS WITH CONSTRAINTS & INDEXES
-- ═══════════════════════════════════════════════════════════════════

-- Bảng 1: Người Dùng (Users)
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NULL,
    `role` ENUM('Member', 'VIP', 'Premium', 'Moderator', 'Admin', 'Owner') DEFAULT 'Member',
    `auth_provider` ENUM('local', 'google', 'discord') DEFAULT 'local',
    `discord_id` VARCHAR(30) UNIQUE NULL,
    `user_code` VARCHAR(20) UNIQUE NULL,
    `api_key` VARCHAR(64) UNIQUE NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_email` (`email`),
    INDEX `idx_username` (`username`),
    INDEX `idx_discord_id` (`discord_id`),
    INDEX `idx_api_key` (`api_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng 2: Tài Khoản Roblox (Accounts)
CREATE TABLE IF NOT EXISTS `accounts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `roblox_username` VARCHAR(50) NOT NULL,
    `level` INT UNSIGNED DEFAULT 1,
    `beli` BIGINT UNSIGNED DEFAULT 0,
    `fragments` INT UNSIGNED DEFAULT 0,
    `sea` TINYINT UNSIGNED DEFAULT 1,
    `race` VARCHAR(30) DEFAULT 'Human',
    `status` ENUM('online', 'offline', 'idle', 'grinding', 'bossing', 'sea_event', 'trading', 'updating', 'reconnecting') DEFAULT 'offline',
    `location` VARCHAR(100) DEFAULT 'Starter Island',
    `playtime` INT UNSIGNED DEFAULT 0,
    `last_seen` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `uk_user_roblox` (`user_id`, `roblox_username`),
    INDEX `idx_user_status` (`user_id`, `status`),
    INDEX `idx_roblox_username` (`roblox_username`),
    INDEX `idx_last_seen` (`last_seen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng 3: Trang Bị Đang Cầm (Account Equipment)
CREATE TABLE IF NOT EXISTS `account_equipment` (
    `account_id` INT PRIMARY KEY,
    `fruit_name` VARCHAR(50) DEFAULT 'None',
    `fruit_mastery` INT UNSIGNED DEFAULT 0,
    `sword_name` VARCHAR(50) DEFAULT 'None',
    `gun_name` VARCHAR(50) DEFAULT 'None',
    `fighting_style` VARCHAR(50) DEFAULT 'Combat',
    `accessory_name` VARCHAR(50) DEFAULT 'None',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng 4: Rương Đồ Trong Game (Inventory Items)
CREATE TABLE IF NOT EXISTS `inventory_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `account_id` INT NOT NULL,
    `category` ENUM('fruit', 'weapon', 'gun', 'style', 'material', 'accessory') NOT NULL,
    `item_name` VARCHAR(100) NOT NULL,
    `quantity` INT UNSIGNED DEFAULT 1,
    `mastery` INT UNSIGNED DEFAULT 0,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `uk_account_category_item` (`account_id`, `category`, `item_name`),
    INDEX `idx_account_category` (`account_id`, `category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng 5: Phiên Cày Bot (Account Sessions)
CREATE TABLE IF NOT EXISTS `account_sessions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `account_id` INT NOT NULL,
    `start_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `end_time` TIMESTAMP NULL,
    `duration_seconds` INT UNSIGNED DEFAULT 0,
    `is_online` BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE CASCADE,
    INDEX `idx_account_online` (`account_id`, `is_online`),
    INDEX `idx_start_time` (`start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng 6: Nhật Ký Hoạt Động (Activity Logs)
CREATE TABLE IF NOT EXISTS `activity_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `account_id` INT NOT NULL,
    `event_type` VARCHAR(50) NOT NULL,
    `description` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE CASCADE,
    INDEX `idx_account_created` (`account_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════
-- 2. VIEWS: BÁO CÁO & BẢNG THỐNG KÊ TỔNG HỢP (ANALYTICS VIEWS)
-- ═══════════════════════════════════════════════════════════════════

-- View 1: Thống Kế Người Dùng & Hội Tài Khoản
CREATE OR REPLACE VIEW `vw_user_dashboard_summary` AS
SELECT 
    u.id AS user_id,
    u.username,
    u.email,
    u.role,
    u.user_code,
    u.discord_id,
    COUNT(a.id) AS total_accounts,
    SUM(CASE WHEN a.status IN ('online', 'grinding', 'bossing', 'sea_event') THEN 1 ELSE 0 END) AS online_accounts,
    SUM(CASE WHEN a.status = 'offline' THEN 1 ELSE 0 END) AS offline_accounts,
    COALESCE(SUM(a.beli), 0) AS total_beli,
    COALESCE(SUM(a.fragments), 0) AS total_fragments,
    COALESCE(AVG(a.level), 1) AS avg_level
FROM `users` u
LEFT JOIN `accounts` a ON u.id = a.user_id
GROUP BY u.id, u.username, u.email, u.role, u.user_code, u.discord_id;

-- View 2: Chi Tiết Chỉ Số & Trang Bị Của Tất Cả Acc Roblox
CREATE OR REPLACE VIEW `vw_account_full_details` AS
SELECT 
    a.id AS account_id,
    u.id AS owner_user_id,
    u.username AS owner_username,
    u.user_code AS owner_code,
    a.roblox_username,
    a.level,
    a.beli,
    a.fragments,
    a.sea,
    a.race,
    a.status,
    a.location,
    a.playtime,
    a.last_seen,
    eq.fruit_name,
    eq.fruit_mastery,
    eq.sword_name,
    eq.gun_name,
    eq.fighting_style,
    eq.accessory_name
FROM `accounts` a
JOIN `users` u ON a.user_id = u.id
LEFT JOIN `account_equipment` eq ON a.id = eq.account_id;

-- ═══════════════════════════════════════════════════════════════════
-- 3. STORED PROCEDURES: HÀM NGHỆC VỤ ĐỒNG BỘ TELEMETRY & TỰ ĐỘNG HÓA
-- ═══════════════════════════════════════════════════════════════════

DELIMITER //

-- Procedure 1: Nguyên khối Đồng bộ Dữ liệu Telemetry từ Roblox Client (Atomic Upsert)
CREATE PROCEDURE `sp_sync_roblox_telemetry`(
    IN p_api_key VARCHAR(64),
    IN p_roblox_username VARCHAR(50),
    IN p_level INT,
    IN p_beli BIGINT,
    IN p_fragments INT,
    IN p_sea TINYINT,
    IN p_race VARCHAR(30),
    IN p_fruit VARCHAR(50),
    IN p_sword VARCHAR(50),
    IN p_gun VARCHAR(50),
    IN p_style VARCHAR(50),
    IN p_accessory VARCHAR(50),
    IN p_status VARCHAR(20),
    IN p_location VARCHAR(100)
)
BEGIN
    DECLARE v_user_id INT;
    DECLARE v_account_id INT;
    DECLARE v_old_level INT DEFAULT 1;

    -- 1. Tìm User sở hữu theo API Key
    SELECT id INTO v_user_id FROM `users` WHERE `api_key` = p_api_key LIMIT 1;

    IF v_user_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid API Key';
    ELSE
        -- 2. Upsert Bảng Accounts
        INSERT INTO `accounts` (user_id, roblox_username, level, beli, fragments, sea, race, status, location, last_seen)
        VALUES (v_user_id, p_roblox_username, p_level, p_beli, p_fragments, p_sea, p_race, p_status, p_location, NOW())
        ON DUPLICATE KEY UPDATE
            level = GREATEST(level, p_level),
            beli = p_beli,
            fragments = p_fragments,
            sea = p_sea,
            race = p_race,
            status = p_status,
            location = p_location,
            last_seen = NOW();

        -- lấy account_id vừa chèn/cập nhật
        SELECT id, level INTO v_account_id, v_old_level FROM `accounts` 
        WHERE user_id = v_user_id AND roblox_username = p_roblox_username LIMIT 1;

        -- 3. Upsert Bảng Account Equipment
        INSERT INTO `account_equipment` (account_id, fruit_name, sword_name, gun_name, fighting_style, accessory_name)
        VALUES (v_account_id, p_fruit, p_sword, p_gun, p_style, p_accessory)
        ON DUPLICATE KEY UPDATE
            fruit_name = p_fruit,
            sword_name = p_sword,
            gun_name = p_gun,
            fighting_style = p_style,
            accessory_name = p_accessory;

        -- 4. Ghi nhận nhật ký nếu Level Up
        IF p_level > v_old_level THEN
            INSERT INTO `activity_logs` (account_id, event_type, description)
            VALUES (v_account_id, 'level_up', CONCAT('Leveled up from ', v_old_level, ' to ', p_level));
        END IF;

    END IF;
END //

-- Procedure 2: Tự động Đóng các Session hết hạn (> 5 phút không có heartbeat)
CREATE PROCEDURE `sp_cleanup_inactive_sessions`()
BEGIN
    -- Cập nhật trạng thái account thành offline nếu mất tín hiệu > 2 phút
    UPDATE `accounts` 
    SET `status` = 'offline' 
    WHERE `status` != 'offline' AND `last_seen` < TIMESTAMPADD(MINUTE, -2, NOW());

    -- Đóng các session đang active của acc vừa offline
    UPDATE `account_sessions` s
    JOIN `accounts` a ON s.account_id = a.id
    SET 
        s.is_online = FALSE,
        s.end_time = NOW(),
        s.duration_seconds = TIMESTAMPDIFF(SECOND, s.start_time, NOW())
    WHERE s.is_online = TRUE AND a.status = 'offline';
END //

DELIMITER ;

-- ═══════════════════════════════════════════════════════════════════
-- 4. DML: TRUY VẤN MẪU HOÀN CHỈNH CHO BACKEND & DISCORD BOT
-- ═══════════════════════════════════════════════════════════════════

-- Lệnh 1: Thêm mới User khi đăng ký
INSERT INTO `users` (`username`, `email`, `password_hash`, `role`, `user_code`, `api_key`)
VALUES ('KhanhPlayer', 'khanh@oceanforge.io', '$2a$12$eImiTXuWVxfM37uY4JANjO', 'Admin', 'USR-9842', 'forge_8a92f1b4c7310e52');

-- Lệnh 2: Liên kết Discord ID khi nhập mã xác nhận
UPDATE `users` 
SET `discord_id` = '1256120988643622934' 
WHERE `id` = 1;

-- Lệnh 3: Tra cứu thông tin Profile từ Discord ID (Dành cho Lệnh /profile Discord Bot)
SELECT 
    u.username, u.role, u.user_code, u.discord_id, u.api_key,
    COUNT(a.id) AS total_accounts,
    SUM(CASE WHEN a.status = 'online' THEN 1 ELSE 0 END) AS online_count
FROM `users` u
LEFT JOIN `accounts` a ON u.id = a.user_id
WHERE u.discord_id = '1256120988643622934'
GROUP BY u.id;

-- Lệnh 4: Tìm kiếm tài khoản Roblox theo Trái Quỷ / Level (Dành cho Lệnh /search)
SELECT 
    a.roblox_username, a.level, a.sea, a.status, eq.fruit_name, eq.fighting_style
FROM `accounts` a
LEFT JOIN `account_equipment` eq ON a.id = eq.account_id
WHERE a.user_id = 1 
  AND a.level >= 2000 
  AND eq.fruit_name LIKE '%Kitsune%'
ORDER BY a.level DESC
LIMIT 10;

-- Lệnh 5: Truy vấn bảng Rương đồ (Inventory) gom nhóm theo phân loại
SELECT 
    category, item_name, quantity, mastery
FROM `inventory_items`
WHERE account_id = 1
ORDER BY category ASC, quantity DESC;
