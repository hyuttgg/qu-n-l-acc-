-- MySQL Database Schema Initialization for Blox Fruits Account Manager / OceanForge
-- Engine: InnoDB | Character Set: utf8mb4

CREATE DATABASE IF NOT EXISTS `bloxfruits_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `bloxfruits_db`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NULL,
    `role` ENUM('user', 'admin') DEFAULT 'user',
    `auth_provider` ENUM('local', 'google', 'discord') DEFAULT 'local',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_email` (`email`),
    INDEX `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Accounts Table
CREATE TABLE IF NOT EXISTS `accounts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `roblox_username` VARCHAR(50) NOT NULL,
    `level` INT UNSIGNED DEFAULT 1,
    `beli` BIGINT UNSIGNED DEFAULT 0,
    `fragments` INT UNSIGNED DEFAULT 0,
    `sea` TINYINT UNSIGNED DEFAULT 1,
    `race` VARCHAR(30) DEFAULT 'Human',
    `status` ENUM('offline', 'idle', 'grinding', 'bossing', 'sea_event', 'trading') DEFAULT 'offline',
    `location` VARCHAR(100) DEFAULT 'Starter Island',
    `playtime` INT UNSIGNED DEFAULT 0,
    `last_seen` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `uk_user_roblox` (`user_id`, `roblox_username`),
    INDEX `idx_user_status` (`user_id`, `status`),
    INDEX `idx_last_seen` (`last_seen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Account Equipment Table
CREATE TABLE IF NOT EXISTS `account_equipment` (
    `account_id` INT PRIMARY KEY,
    `fruit_name` VARCHAR(50) DEFAULT 'None',
    `fruit_mastery` INT UNSIGNED DEFAULT 0,
    `sword_name` VARCHAR(50) DEFAULT 'None',
    `gun_name` VARCHAR(50) DEFAULT 'None',
    `fighting_style` VARCHAR(50) DEFAULT 'Combat',
    `accessory_name` VARCHAR(50) DEFAULT 'None',
    FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Inventory Items Table
CREATE TABLE IF NOT EXISTS `inventory_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `account_id` INT NOT NULL,
    `category` ENUM('fruit', 'weapon', 'gun', 'style', 'material', 'accessory') NOT NULL,
    `item_name` VARCHAR(100) NOT NULL,
    `quantity` INT UNSIGNED DEFAULT 1,
    `mastery` INT UNSIGNED DEFAULT 0,
    FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE CASCADE,
    INDEX `idx_account_category` (`account_id`, `category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Account Sessions Table
CREATE TABLE IF NOT EXISTS `account_sessions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `account_id` INT NOT NULL,
    `start_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `end_time` TIMESTAMP NULL,
    `duration_seconds` INT UNSIGNED DEFAULT 0,
    `is_online` BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE CASCADE,
    INDEX `idx_account_online` (`account_id`, `is_online`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
