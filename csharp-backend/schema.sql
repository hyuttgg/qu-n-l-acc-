-- ==============================================================================
-- OCEANFORGE ROBLOX TELEMETRY DATABASE SCHEMA (MYSQL 8.0+)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `oceanforge_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `oceanforge_db`;

-- 1. USERS TABLE (Bảo mật tài khoản Web Admin & Client)
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(64) NOT NULL UNIQUE,
    `email` VARCHAR(128) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `api_key` VARCHAR(128) NOT NULL UNIQUE,
    `role` ENUM('Owner', 'Admin', 'Moderator', 'Developer', 'VIP', 'Member') DEFAULT 'Member',
    `nickname` VARCHAR(64) DEFAULT NULL,
    `user_code` VARCHAR(32) DEFAULT NULL UNIQUE,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `last_login` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_api_key` (`api_key`),
    INDEX `idx_users_username` (`username`)
) ENGINE=InnoDB;

-- 2. ACCOUNTS TABLE (Tài khoản Roblox Game Telemetry)
CREATE TABLE IF NOT EXISTS `accounts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `roblox_username` VARCHAR(64) NOT NULL,
    `level` INT DEFAULT 1,
    `beli` BIGINT DEFAULT 0,
    `fragments` BIGINT DEFAULT 0,
    `sea` INT DEFAULT 1,
    `race` VARCHAR(32) DEFAULT 'Human',
    `fruit` VARCHAR(64) DEFAULT 'None',
    `fruit_mastery` INT DEFAULT 0,
    `sword` VARCHAR(64) DEFAULT 'None',
    `gun` VARCHAR(64) DEFAULT 'None',
    `fighting_style` VARCHAR(64) DEFAULT 'Combat',
    `accessory` VARCHAR(64) DEFAULT 'None',
    `status` VARCHAR(32) DEFAULT 'idle',
    `location` VARCHAR(128) DEFAULT 'Starter Island',
    `playtime_seconds` INT DEFAULT 0,
    `last_heartbeat` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `is_online` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_accounts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    UNIQUE KEY `uk_user_roblox` (`user_id`, `roblox_username`),
    INDEX `idx_accounts_roblox` (`roblox_username`),
    INDEX `idx_accounts_online` (`is_online`, `last_heartbeat`)
) ENGINE=InnoDB;

-- 3. AUDIT / SECURITY LOGS TABLE (Ghi vết bảo mật & tấn công)
CREATE TABLE IF NOT EXISTS `security_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `ip_address` VARCHAR(45) NOT NULL,
    `action` VARCHAR(64) NOT NULL,
    `details` TEXT DEFAULT NULL,
    `is_threat` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_logs_ip` (`ip_address`),
    INDEX `idx_logs_created` (`created_at`)
) ENGINE=InnoDB;
