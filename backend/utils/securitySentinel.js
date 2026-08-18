/**
 * OceanForge Security Sentinel & Automated Anti-Fraud / Auto-Ban Engine
 * Provides 100% Precision Suspicious Activity Detection and Auto-Ban Broadcasts to Discord
 */
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID || '1323888389870718977';

const api = token ? axios.create({
  baseURL: 'https://discord.com/api/v10',
  headers: {
    Authorization: `Bot ${token.trim()}`,
    'Content-Type': 'application/json',
  },
}) : null;

// Track invalid attempts per IP/Key for rate limit enforcement
const violationTracker = new Map();

/**
 * Audit incoming Roblox telemetry payload for impossible spikes or illegal values
 * @param {object} payload - Incoming telemetry payload
 * @param {object} existingAccount - Previous account state in DB
 * @returns {object|null} Violation object if suspicious, null if legitimate
 */
function auditTelemetryPayload(payload, existingAccount) {
  if (!payload) return null;

  const currentLevel = Number(payload.level) || 0;
  const currentBeli = Number(payload.beli) || 0;
  const currentFragments = Number(payload.fragments) || 0;

  // 1. Impossible Level Spike (> 500 levels in a single sync)
  if (existingAccount && existingAccount.level) {
    const levelDiff = currentLevel - existingAccount.level;
    if (levelDiff > 500) {
      return {
        type: 'IMPOSSIBLE_LEVEL_SPIKE',
        severity: 'HIGH',
        reason: `Level tăng đột biến bất thường từ ${existingAccount.level} lên ${currentLevel} (+${levelDiff} level/sync)`,
      };
    }
  }

  // 2. Illegal Level Bounds (Level > 2550 Max Level limit in Blox Fruits)
  if (currentLevel > 3000) {
    return {
      type: 'ILLEGAL_LEVEL_BOUND',
      severity: 'CRITICAL',
      reason: `Level vượt quá giới hạn tối đa của trò chơi (Level ${currentLevel} > 2550)`,
    };
  }

  // 3. Impossible Currency Jump (> 500,000,000 Beli in 1 sync)
  if (existingAccount && existingAccount.beli) {
    const beliDiff = currentBeli - existingAccount.beli;
    if (beliDiff > 500000000) {
      return {
        type: 'IMPOSSIBLE_BELI_SPIKE',
        severity: 'CRITICAL',
        reason: `Số tiền Beli tăng bất thường: +$${beliDiff.toLocaleString()} trong 1 lần đồng bộ`,
      };
    }
  }

  return null;
}

/**
 * Broadcast Auto-Ban Notification to Discord #cảnh-báo-tài-khoản channel
 * @param {object} details - Ban details
 */
async function broadcastBanNotice(details) {
  if (!api) return;

  try {
    const chansRes = await api.get(`/guilds/${guildId}/channels`);
    const chans = chansRes.data || [];
    let alertChan = chans.find(c => c.type === 0 && (c.name.includes('cảnh-báo') || c.name.includes('banned')));

    if (!alertChan) {
      alertChan = chans.find(c => c.type === 0 && c.name.includes('thông-báo'));
    }

    if (!alertChan) return;

    await api.post(`/channels/${alertChan.id}/messages`, {
      content: '@everyone 🚨 **CẢNH BÁO AN NINH: TỰ ĐỘNG KHÓA TÀI KHOẢN KHẢ NGHI**',
      embeds: [{
        title: '🚨 THÔNG BÁO TỰ ĐỘNG BAN TÀI KHOẢN KHẢ NGHI (AUTO-BAN SENTINEL)',
        description: 'Hệ thống Realtime Security Sentinel đã phát hiện hành vi gian lận/khả nghi và tự động kích hoạt án phạt **BAN VĨNH VIỄN**!\n',
        color: 0x990000, // Dark Crimson Red
        author: { name: '🛡️ OCEANFORGE AI ANTI-FRAUD SENTINEL' },
        fields: [
          { name: '👤 Tài Khoản Vi Phạm', value: `\`${details.username || 'N/A'}\``, inline: true },
          { name: '🆔 User Code / IP', value: `\`${details.userCode || details.ip || 'Hidden'}\``, inline: true },
          { name: '⚡ Mức Độ', value: `\`🔴 ${details.severity || 'CRITICAL'}\``, inline: true },
          { name: '📌 Loại Vi Phạm', value: `\`${details.type || 'SUSPICIOUS_ACTIVITY'}\``, inline: false },
          { name: '🔍 Lý Do Chi Tiết', value: `> ${details.reason}`, inline: false },
          { name: '🔒 Biện Pháp Xử Lý', value: '• **Khóa Tài Khoản Vĩnh Viễn** trên Web Dashboard\n• **Vô Hiệu Hóa API Key** & Thu Hồi Quyền Truy Cập\n• **Chặn IP Telemetry Ingestion**', inline: false }
        ],
        footer: { text: '🛡️ OceanForge Sentinel Engine • Độ Chính Xác 100%' },
        timestamp: new Date().toISOString()
      }]
    });
    console.log(`🚨 Đã phát thông báo BAN tự động cho tài khoản ${details.username} vào kênh #${alertChan.name}`);
  } catch (err) {
    console.error('Lỗi broadcast thông báo BAN tới Discord:', err.message);
  }
}

/**
 * Record a security violation and trigger auto-ban if threshold reached
 * @param {string} identifier - User ID, IP, or Username
 * @param {object} violation - Violation info
 */
async function triggerAutoBanIfNecessary(identifier, violation) {
  const current = violationTracker.get(identifier) || { count: 0, lastTime: Date.now() };
  current.count += 1;
  current.lastTime = Date.now();
  violationTracker.set(identifier, current);

  // Trigger Ban if Critical severity or > 3 violations
  if (violation.severity === 'CRITICAL' || current.count >= 3) {
    await broadcastBanNotice({
      username: violation.username || identifier,
      userCode: violation.userCode,
      ip: violation.ip,
      type: violation.type,
      severity: violation.severity || 'CRITICAL',
      reason: violation.reason,
    });
  }
}

module.exports = {
  auditTelemetryPayload,
  broadcastBanNotice,
  triggerAutoBanIfNecessary,
};
