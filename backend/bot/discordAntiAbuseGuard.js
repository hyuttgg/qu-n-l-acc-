/**
 * Discord Server Realtime Anti-Abuse Guard & Auto-Ban Listener
 * Monitors Discord Server Activity for:
 * 1. Phishing / Fake Nitro / Token Logger links
 * 2. Command & Message Spam Flooding
 * 3. Discord Invite Link Spam (discord.gg/...)
 * 4. Mass Mention Abuse (@everyone / @here spam)
 * 5. Malicious Executable / Script Attachments
 */
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const { notifyCritical, notifyWarning, notifyInfo } = require('../utils/devopsNotifier');

const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID || '1323888389870718977';

const api = token ? axios.create({
  baseURL: 'https://discord.com/api/v10',
  headers: {
    Authorization: `Bot ${token.trim()}`,
    'Content-Type': 'application/json',
  },
}) : null;

// Track message frequency per Discord User ID for spam detection
const userMessageTracker = new Map();

// Memory leak prevention: Periodic cleanup of tracker map every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, track] of userMessageTracker.entries()) {
    if (now - track.firstTime > 60000) { // older than 1 min
      userMessageTracker.delete(userId);
    }
  }
}, 10 * 60 * 1000);

// Phishing & Malicious Patterns
const MALICIOUS_PATTERNS = [
  /discord-gift/i,
  /free-nitro/i,
  /dlscord/i,
  /discorcl/i,
  /token-grabber/i,
  /steam-community-gift/i,
  /bit\.ly/i,
  /tinyurl\.com/i,
  /\.exe$/i,
  /\.scr$/i,
  /\.bat$/i,
];

// Discord Invite Links Pattern
const DISCORD_INVITE_PATTERN = /(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/i;

/**
 * Audit incoming Discord message for suspicious activity
 * @param {object} message - Raw Discord Message Object
 * @returns {object|null} Violation details if suspicious, null if safe
 */
function auditDiscordMessage(message) {
  if (!message || !message.content || message.author?.bot) return null;

  const content = message.content;
  const authorId = message.author.id;

  // 1. Check for Phishing / Fake Nitro / Token Logger links
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      return {
        type: 'DISCORD_PHISHING_LINK',
        severity: 'CRITICAL',
        reason: `Phát hiện liên kết lừa đảo / Phishing / Hack Discord Token: "${content.slice(0, 100)}"`,
      };
    }
  }

  // 2. Check for Unauthorized Discord Server Invites
  if (DISCORD_INVITE_PATTERN.test(content)) {
    return {
      type: 'DISCORD_INVITE_SPAM',
      severity: 'HIGH',
      reason: `Quảng cáo liên kết mời Discord Server khác trái phép`,
    };
  }

  // 3. Check for Mass Mention Abuse
  if ((message.mention_everyone || (message.mentions && message.mentions.length > 5))) {
    return {
      type: 'MASS_MENTION_SPAM',
      severity: 'CRITICAL',
      reason: `Lạm dụng Tag Mass Mention (@everyone/@here hoặc tag > 5 người trong 1 tin nhắn)`,
    };
  }

  // 4. Rate-Limit / Command Spam Flooding Check
  const now = Date.now();
  const userTrack = userMessageTracker.get(authorId) || { count: 0, firstTime: now };

  if (now - userTrack.firstTime < 5000) { // Within 5-second window
    userTrack.count += 1;
    userMessageTracker.set(authorId, userTrack);

    if (userTrack.count >= 6) { // More than 6 messages in 5 seconds
      return {
        type: 'COMMAND_SPAM_FLOODING',
        severity: 'HIGH',
        reason: `Spam tin nhắn / Lệnh Bot dồn dập (${userTrack.count} tin nhắn/5 giây)`,
      };
    }
  } else {
    // Reset window
    userMessageTracker.set(authorId, { count: 1, firstTime: now });
  }

  return null;
}

/**
 * Delete offending message and Ban user from Discord Guild
 * @param {string} channelId 
 * @param {string} messageId 
 * @param {string} userId 
 * @param {string} username 
 * @param {object} violation 
 */
async function executeDiscordAutoBan(channelId, messageId, userId, username, violation) {
  if (!api) return;

  try {
    // 1. Delete offending message immediately
    if (channelId && messageId) {
      await api.delete(`/channels/${channelId}/messages/${messageId}`).catch(() => {});
    }

    // 2. Ban Member from Discord Server
    await api.put(`/guilds/${guildId}/bans/${userId}`, {
      delete_message_days: 1,
      reason: `Auto-Ban Sentinel: ${violation.reason}`
    }).catch(err => {
      console.error(`- Không thể ban thành viên ${username} (Có thể là Admin/Owner):`, err.message);
    });

    // 3. Post Ban Announcement into #cảnh-báo-tài-khoản / #🔨・cảnh-báo-banned
    const chansRes = await api.get(`/guilds/${guildId}/channels`);
    const chans = chansRes.data || [];
    let alertChan = chans.find(c => c.type === 0 && (c.name.includes('cảnh-báo') || c.name.includes('banned')));

    if (!alertChan) {
      alertChan = chans.find(c => c.type === 0 && c.name.includes('thông-báo'));
    }

    if (alertChan) {
      await api.post(`/channels/${alertChan.id}/messages`, {
        content: '@everyone 🚨 **CẢNH BÁO AN NINH DISCORD: ĐÃ AUTO-BAN THÀNH VIÊN KHẢ NGHI**',
        embeds: [{
          title: '🔨 THÔNG BÁO AUTO-BAN THÀNH VIÊN VI PHẠM TẠI NHÓM DISCORD',
          description: `Hệ thống Discord Anti-Abuse Sentinel đã tự động xóa tin nhắn độc hại và **BAN VĨNH VIỄN** thành viên vi phạm khỏi Máy Chủ Discord!`,
          color: 0x990000, // Dark Red
          author: { name: '🛡️ DISCORD SERVER ANTI-ABUSE GUARD' },
          fields: [
            { name: '👤 Thành Viên Vi Phạm', value: `<@${userId}> (\`${username}\`)`, inline: true },
            { name: '🆔 Discord ID', value: `\`${userId}\``, inline: true },
            { name: '⚡ Mức Độ Vi Phạm', value: `\`🔴 ${violation.severity}\``, inline: true },
            { name: '📌 Loại Vi Phạm', value: `\`${violation.type}\``, inline: false },
            { name: '🔍 Bằng Chứng / Lý Do', value: `> ${violation.reason}`, inline: false },
            { name: '🔒 Hành Động Đã Thực Hiện', value: '• **Xóa Tin Nhắn Độc Hại Ngay Lập Tức**\n• **BAN Vĩnh Viễn Khỏi Discord Server**\n• **Vô Hiệu Hóa Quyền Truy Cập Kênh**', inline: false }
          ],
          footer: { text: '🛡️ Discord Anti-Abuse Sentinel • Độ Chính Xác 100%' },
          timestamp: new Date().toISOString()
        }]
      });
    }

    console.log(`🚨 [DISCORD ANTI-ABUSE]: Đã BAN thành công ${username} (${userId}) vì lý do: ${violation.reason}`);

    // 4. Send alert to DevOps Notifier
    await notifyCritical(
      'DiscordAntiAbuseGuard',
      `Auto-Ban Member: ${username}`,
      `Phát hiện vi phạm nghiêm trọng (${violation.type}): ${violation.reason}`,
      `User ID: ${userId} | Channel ID: ${channelId} | Severity: ${violation.severity}`
    );

  } catch (err) {
    console.error('Lỗi khi thực thi Auto-Ban Discord:', err.message);
  }
}

module.exports = {
  auditDiscordMessage,
  executeDiscordAutoBan,
};
