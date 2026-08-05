/**
 * Enforce Strict Read-Only Permissions for Discord Announcement Channels (@everyone)
 * Completely denies:
 * - Text Messages (SEND_MESSAGES: 2048)
 * - Images/Videos/Files (ATTACH_FILES: 32768)
 * - Voice Messages (SEND_VOICE_MESSAGES: 70368744177664)
 * - Embed Links (EMBED_LINKS: 16384)
 * - Thread Creation & Messaging (THREADS: 377956122112)
 * - External Emojis/Stickers & Reactions (ADD_REACTIONS: 64, EMOJIS: 137439215616)
 * 
 * Allows ONLY:
 * - View Channel (VIEW_CHANNEL: 1024)
 * - Read Message History (READ_MESSAGE_HISTORY: 65536)
 */
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID || '1323888389870718977';

const ANNOUNCEMENT_CHANNELS = [
  'thông-báo',
  'cập-nhật-hệ-thống',
  'chào-mừng',
  'cảnh-báo-tài-khoản'
];

async function enforceStrictReadOnlyPermissions() {
  if (!token) {
    console.log('⚠️ DISCORD_BOT_TOKEN missing in backend/.env');
    return;
  }

  const api = axios.create({
    baseURL: 'https://discord.com/api/v10',
    headers: {
      Authorization: `Bot ${token.trim()}`,
      'Content-Type': 'application/json',
    },
  });

  try {
    console.log(`⏳ Đang thiết lập khóa toàn bộ quyền gửi tin nhắn, hình ảnh, video và thoại cho @everyone...`);
    const chansRes = await api.get(`/guilds/${guildId}/channels`);
    const chans = chansRes.data || [];
    const everyoneRoleId = guildId;

    // 1. Read-Only Announcement Channels:
    // ALLOW: VIEW_CHANNEL (1024) + READ_MESSAGE_HISTORY (65536) = 66560
    const readOnlyAllow = '66560';
    // DENY: SEND_MESSAGES (2048), ATTACH_FILES (32768), EMBED_LINKS (16384), ADD_REACTIONS (64), VOICE, THREADS, etc.
    const readOnlyDeny = '70884456939584';

    // 2. Interactive Bot Channels:
    // ALLOW: VIEW_CHANNEL (1024) + READ_MESSAGE_HISTORY (65536) + SEND_MESSAGES (2048) + USE_APPLICATION_COMMANDS (2147483648) = 2147551232
    const interactiveAllow = '2147551232';
    const interactiveDeny = '32768'; // Deny file attachments for clean channels

    const INTERACTIVE_CHANNELS = [
      'liên-kết-tài-khoản',
      'tra-cứu-hồ-sơ',
      'thống-kê-chỉ-số',
      'tìm-kiếm-acc'
    ];

    // Enforce Read-Only Announcement Channels
    for (const nameKeyword of ANNOUNCEMENT_CHANNELS) {
      const chan = chans.find(c => c.type === 0 && c.name.includes(nameKeyword));
      if (chan) {
        try {
          await api.put(`/channels/${chan.id}/permissions/${everyoneRoleId}`, {
            allow: readOnlyAllow,
            deny: readOnlyDeny,
            type: 0 // ROLE
          });
          console.log(`🔒 Kênh #${chan.name}: ĐÃ KHÓA TOÀN BỘ Quyền gửi Tin Nhắn, Ảnh, Video, Voice & File đối với Thành Viên thường!`);
        } catch (perErr) {
          console.error(`- Lỗi khóa kênh #${chan.name}:`, perErr.response?.data?.message || perErr.message);
        }
      }
    }

    // Enforce Interactive Bot Command Channels
    for (const nameKeyword of INTERACTIVE_CHANNELS) {
      const chan = chans.find(c => c.type === 0 && c.name.includes(nameKeyword));
      if (chan) {
        try {
          await api.put(`/channels/${chan.id}/permissions/${everyoneRoleId}`, {
            allow: interactiveAllow,
            deny: interactiveDeny,
            type: 0 // ROLE
          });
          console.log(`💬 Kênh #${chan.name}: ĐÃ MỞ Quyền Tương Tác Bot (/Slash & Text Commands) cho Thành Viên!`);
        } catch (perErr) {
          console.error(`- Lỗi thiết lập kênh #${chan.name}:`, perErr.response?.data?.message || perErr.message);
        }
      }
    }

    console.log('\n🎉 ĐÃ THIẾT LẬP THÀNH CÔNG QUYỀN HẠN CHUẨN XÁC CHO TOÀN BỘ KÊNH TRÊN DISCORD!');

  } catch (err) {
    console.error('❌ Lỗi khi thiết lập quyền kênh:', err.response?.data || err.message);
  }
}

if (require.main === module) {
  enforceStrictReadOnlyPermissions();
}

module.exports = enforceStrictReadOnlyPermissions;
