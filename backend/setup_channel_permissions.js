/**
 * OceanForge Discord Channel Permissions & Notification Routing Setup
 * ────────────────────────────────────────────────────────────────────
 * Script này thiết lập:
 *   1. Quyền hạn rõ ràng cho từng kênh Discord (ai được xem, ai được gửi)
 *   2. Routing thông báo: DevOps → đúng kênh chuyên dụng
 *   3. Thời gian gửi thông báo hợp lý (cooldown per severity per channel)
 *   4. Tạo kênh DevOps riêng nếu chưa có
 * 
 * Usage: node setup_channel_permissions.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const axios = require('axios');

// ═══════════════════════════════════════
// DISCORD API CONFIG
// ═══════════════════════════════════════
const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

const api = axios.create({
  baseURL: 'https://discord.com/api/v10',
  headers: {
    Authorization: `Bot ${token.trim()}`,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ═══════════════════════════════════════
// DISCORD PERMISSION FLAGS (Bitfield)
// ═══════════════════════════════════════
const PERMS = {
  VIEW_CHANNEL:           0x0000000000000400n,  // Xem kênh
  SEND_MESSAGES:          0x0000000000000800n,  // Gửi tin nhắn
  SEND_MESSAGES_IN_THREADS: 0x0000004000000000n, // Gửi tin nhắn trong thread
  MANAGE_MESSAGES:        0x0000000000002000n,  // Quản lý tin nhắn (xóa, ghim)
  EMBED_LINKS:            0x0000000000004000n,  // Nhúng links
  ATTACH_FILES:           0x0000000000008000n,  // Đính kèm files
  READ_MESSAGE_HISTORY:   0x0000000000010000n,  // Đọc lịch sử tin nhắn
  MENTION_EVERYONE:       0x0000000000020000n,  // @everyone
  USE_EXTERNAL_EMOJIS:    0x0000000000040000n,  // Dùng emoji ngoài
  ADD_REACTIONS:          0x0000000000000040n,  // Thêm reactions
  MANAGE_CHANNELS:        0x0000000000000010n,  // Quản lý kênh
  MANAGE_ROLES:           0x0000000010000000n,  // Quản lý quyền
  MANAGE_WEBHOOKS:        0x0000000020000000n,  // Quản lý webhook
  CREATE_PUBLIC_THREADS:  0x0000000800000000n,  // Tạo thread công khai
  USE_APPLICATION_COMMANDS: 0x0000000080000000n, // Dùng slash commands
};

// ═══════════════════════════════════════
// CHANNEL PERMISSION PROFILES
// ═══════════════════════════════════════
// Mỗi profile xác định: @everyone được làm gì, Bot được làm gì

const CHANNEL_PROFILES = {
  // ── Kênh Thông Báo (Chỉ Bot gửi, members chỉ đọc) ──
  ANNOUNCEMENT: {
    description: 'Kênh thông báo — Chỉ Bot/Admin gửi, members chỉ đọc',
    everyone: {
      allow: PERMS.VIEW_CHANNEL | PERMS.READ_MESSAGE_HISTORY | PERMS.ADD_REACTIONS | PERMS.USE_EXTERNAL_EMOJIS,
      deny: PERMS.SEND_MESSAGES | PERMS.MANAGE_MESSAGES | PERMS.MENTION_EVERYONE | PERMS.MANAGE_CHANNELS | PERMS.CREATE_PUBLIC_THREADS,
    },
    bot: {
      allow: PERMS.VIEW_CHANNEL | PERMS.SEND_MESSAGES | PERMS.EMBED_LINKS | PERMS.ATTACH_FILES |
             PERMS.READ_MESSAGE_HISTORY | PERMS.MENTION_EVERYONE | PERMS.MANAGE_MESSAGES | PERMS.USE_EXTERNAL_EMOJIS,
      deny: 0n,
    },
  },

  // ── Kênh Cảnh Báo Bảo Mật (Chỉ Bot gửi, members xem, không chat) ──
  SECURITY_ALERT: {
    description: 'Kênh cảnh báo — Bot gửi cảnh báo bảo mật, members chỉ xem',
    everyone: {
      allow: PERMS.VIEW_CHANNEL | PERMS.READ_MESSAGE_HISTORY | PERMS.ADD_REACTIONS,
      deny: PERMS.SEND_MESSAGES | PERMS.MANAGE_MESSAGES | PERMS.MENTION_EVERYONE | PERMS.CREATE_PUBLIC_THREADS | PERMS.ATTACH_FILES,
    },
    bot: {
      allow: PERMS.VIEW_CHANNEL | PERMS.SEND_MESSAGES | PERMS.EMBED_LINKS | PERMS.ATTACH_FILES |
             PERMS.READ_MESSAGE_HISTORY | PERMS.MENTION_EVERYONE | PERMS.MANAGE_MESSAGES | PERMS.USE_EXTERNAL_EMOJIS,
      deny: 0n,
    },
  },

  // ── Kênh DevOps (Chỉ Admin/Bot, members không thấy) ──
  DEVOPS_PRIVATE: {
    description: 'Kênh DevOps riêng — Chỉ Admin và Bot truy cập',
    everyone: {
      allow: 0n,
      deny: PERMS.VIEW_CHANNEL | PERMS.SEND_MESSAGES | PERMS.READ_MESSAGE_HISTORY,
    },
    bot: {
      allow: PERMS.VIEW_CHANNEL | PERMS.SEND_MESSAGES | PERMS.EMBED_LINKS | PERMS.ATTACH_FILES |
             PERMS.READ_MESSAGE_HISTORY | PERMS.MENTION_EVERYONE | PERMS.MANAGE_MESSAGES | PERMS.USE_EXTERNAL_EMOJIS |
             PERMS.MANAGE_WEBHOOKS,
      deny: 0n,
    },
  },

  // ── Kênh Dữ Liệu (Bot gửi data, members xem, không chat bừa) ──
  DATA_READONLY: {
    description: 'Kênh dữ liệu — Bot gửi data, members xem + reaction',
    everyone: {
      allow: PERMS.VIEW_CHANNEL | PERMS.READ_MESSAGE_HISTORY | PERMS.ADD_REACTIONS | PERMS.USE_EXTERNAL_EMOJIS |
             PERMS.USE_APPLICATION_COMMANDS,
      deny: PERMS.SEND_MESSAGES | PERMS.MANAGE_MESSAGES | PERMS.MENTION_EVERYONE | PERMS.CREATE_PUBLIC_THREADS,
    },
    bot: {
      allow: PERMS.VIEW_CHANNEL | PERMS.SEND_MESSAGES | PERMS.EMBED_LINKS | PERMS.ATTACH_FILES |
             PERMS.READ_MESSAGE_HISTORY | PERMS.MANAGE_MESSAGES | PERMS.USE_EXTERNAL_EMOJIS,
      deny: 0n,
    },
  },

  // ── Kênh Tương Tác (Members được chat, nhưng không @everyone) ──
  INTERACTIVE: {
    description: 'Kênh tương tác — Members được chat, nhưng không spam @everyone',
    everyone: {
      allow: PERMS.VIEW_CHANNEL | PERMS.SEND_MESSAGES | PERMS.READ_MESSAGE_HISTORY | PERMS.ADD_REACTIONS |
             PERMS.EMBED_LINKS | PERMS.ATTACH_FILES | PERMS.USE_EXTERNAL_EMOJIS | PERMS.USE_APPLICATION_COMMANDS |
             PERMS.CREATE_PUBLIC_THREADS | PERMS.SEND_MESSAGES_IN_THREADS,
      deny: PERMS.MENTION_EVERYONE | PERMS.MANAGE_MESSAGES | PERMS.MANAGE_CHANNELS,
    },
    bot: {
      allow: PERMS.VIEW_CHANNEL | PERMS.SEND_MESSAGES | PERMS.EMBED_LINKS | PERMS.ATTACH_FILES |
             PERMS.READ_MESSAGE_HISTORY | PERMS.MANAGE_MESSAGES | PERMS.MENTION_EVERYONE | PERMS.USE_EXTERNAL_EMOJIS,
      deny: 0n,
    },
  },

  // ── Kênh Chào Mừng (Bot gửi welcome, members xem) ──
  WELCOME: {
    description: 'Kênh chào mừng — Bot gửi welcome message, members chỉ đọc',
    everyone: {
      allow: PERMS.VIEW_CHANNEL | PERMS.READ_MESSAGE_HISTORY | PERMS.ADD_REACTIONS | PERMS.USE_EXTERNAL_EMOJIS,
      deny: PERMS.SEND_MESSAGES | PERMS.MANAGE_MESSAGES | PERMS.MENTION_EVERYONE | PERMS.CREATE_PUBLIC_THREADS,
    },
    bot: {
      allow: PERMS.VIEW_CHANNEL | PERMS.SEND_MESSAGES | PERMS.EMBED_LINKS | PERMS.ATTACH_FILES |
             PERMS.READ_MESSAGE_HISTORY | PERMS.MANAGE_MESSAGES | PERMS.MENTION_EVERYONE | PERMS.USE_EXTERNAL_EMOJIS,
      deny: 0n,
    },
  },
};

// ═══════════════════════════════════════
// CHANNEL → PROFILE MAPPING
// ═══════════════════════════════════════
// Map tên kênh → profile phù hợp

const CHANNEL_MAPPING = {
  // Nhóm 1: Kênh chữ (không emoji)
  'thông-báo':           'ANNOUNCEMENT',
  'cập-nhật-hệ-thống':  'ANNOUNCEMENT',
  'liên-kết-tài-khoản': 'DATA_READONLY',
  'tra-cứu-hồ-sơ':     'DATA_READONLY',
  'thống-kê-chỉ-số':   'DATA_READONLY',
  'tìm-kiếm-acc':      'DATA_READONLY',
  'cảnh-báo-tài-khoản': 'SECURITY_ALERT',
  'trò-chuyện-chung':   'INTERACTIVE',

  // Nhóm 2: Kênh emoji
  'thông-báo':           'ANNOUNCEMENT',      // 💻・thông-báo
  'cập-nhật-hệ-thống':  'ANNOUNCEMENT',      // 🚀・cập-nhật-hệ-thống
  'liên-kết-tài-khoản': 'DATA_READONLY',     // 🧬・liên-kết-tài-khoản
  'tra-cứu-hồ-sơ':     'DATA_READONLY',     // 👾・tra-cứu-hồ-sơ
  'thống-kê-chỉ-số':   'DATA_READONLY',     // 📈・thống-kê-chỉ-số
  'tìm-kiếm-acc':      'DATA_READONLY',     // 🔍・tìm-kiếm-acc
  'cảnh-báo-tài-khoản': 'SECURITY_ALERT',   // 🏴‍☠️・cảnh-báo-tài-khoản
  'trò-chuyện-chung':   'INTERACTIVE',       // 💬・trò-chuyện-chung
  'hỗ-trợ-kỹ-thuật':   'INTERACTIVE',       // 🛠️・hỗ-trợ-kỹ-thuật
  'chào-mừng':          'WELCOME',           // 👋・chào-mừng
};

// ═══════════════════════════════════════
// NOTIFICATION ROUTING CONFIG
// Mỗi loại thông báo → gửi đến kênh nào
// ═══════════════════════════════════════
const NOTIFICATION_ROUTING = {
  // DevOps engine alerts → kênh DevOps riêng (sẽ tạo nếu chưa có)
  devops: {
    targetChannelKeywords: ['devops', 'hệ-thống'],
    fallback: 'cập-nhật-hệ-thống',
  },
  // Security/anti-fraud alerts → kênh cảnh báo
  security: {
    targetChannelKeywords: ['cảnh-báo'],
    fallback: 'cảnh-báo-tài-khoản',
  },
  // Deployment announcements → kênh thông báo
  deployment: {
    targetChannelKeywords: ['thông-báo'],
    fallback: 'thông-báo',
  },
};

// ═══════════════════════════════════════
// NOTIFICATION TIMING / COOLDOWN CONFIG
// Thời gian chờ giữa các thông báo cùng loại
// ═══════════════════════════════════════
const NOTIFICATION_COOLDOWN = {
  CRITICAL: {
    cooldownMs: 0,               // Gửi ngay lập tức, không chờ
    description: 'Gửi ngay — sự cố nghiêm trọng',
    maxPerHour: 30,              // Tối đa 30 alerts/giờ
  },
  ERROR: {
    cooldownMs: 2 * 60 * 1000,  // 2 phút
    description: 'Cooldown 2 phút giữa các lỗi cùng service',
    maxPerHour: 20,
  },
  WARNING: {
    cooldownMs: 5 * 60 * 1000,  // 5 phút
    description: 'Cooldown 5 phút — tránh spam cảnh báo',
    maxPerHour: 10,
  },
  INFO: {
    cooldownMs: 10 * 60 * 1000, // 10 phút
    description: 'Cooldown 10 phút — chỉ gửi thông tin quan trọng',
    maxPerHour: 6,
  },
};

// ═══════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════
function log(emoji, msg) {
  console.log(`${emoji}  ${msg}`);
}

function logSection(title) {
  console.log('');
  console.log('═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getProfileForChannel(channelName) {
  // Strip emoji prefix (e.g., "💻・thông-báo" → "thông-báo")
  const stripped = channelName.replace(/^[^\p{L}]*・/u, '').trim();
  
  // Try exact match first
  for (const [keyword, profile] of Object.entries(CHANNEL_MAPPING)) {
    if (stripped === keyword || channelName.includes(keyword)) {
      return profile;
    }
  }

  // Fallback: if it has "cảnh-báo" → SECURITY, if "thông-báo" → ANNOUNCEMENT
  if (channelName.includes('cảnh-báo')) return 'SECURITY_ALERT';
  if (channelName.includes('thông-báo')) return 'ANNOUNCEMENT';
  if (channelName.includes('chào-mừng')) return 'WELCOME';
  if (channelName.includes('trò-chuyện') || channelName.includes('hỗ-trợ')) return 'INTERACTIVE';
  
  return 'DATA_READONLY'; // Default: safe readonly
}

// ═══════════════════════════════════════
// STEP 1: Get Bot user ID & Guild info
// ═══════════════════════════════════════
async function getBotAndGuildInfo() {
  logSection('STEP 1: Lấy thông tin Bot & Guild');

  const botRes = await api.get('/users/@me');
  const bot = botRes.data;
  log('🤖', `Bot: ${bot.username} (ID: ${bot.id})`);

  const guildRes = await api.get(`/guilds/${guildId}`);
  const guild = guildRes.data;
  log('🏠', `Guild: ${guild.name} (Owner: ${guild.owner_id})`);

  return { botId: bot.id, guild };
}

// ═══════════════════════════════════════
// STEP 2: Get or Create DevOps channel
// ═══════════════════════════════════════
async function ensureDevOpsChannel(botId) {
  logSection('STEP 2: Tạo kênh DevOps riêng (nếu chưa có)');

  const chansRes = await api.get(`/guilds/${guildId}/channels`);
  const channels = chansRes.data;

  // Check if devops channel already exists
  let devopsChannel = channels.find(c => c.type === 0 && c.name.includes('devops'));

  if (devopsChannel) {
    log('✅', `Kênh DevOps đã tồn tại: #${devopsChannel.name} (${devopsChannel.id})`);
    return { devopsChannel, allChannels: channels };
  }

  // Find the "CẢNH BÁO TỰ ĐỘNG" category to put devops channel in
  let targetCategory = channels.find(c => c.type === 4 && (
    c.name.includes('CẢNH BÁO') || c.name.includes('HỆ THỐNG') || c.name.includes('ADMIN')
  ));

  if (!targetCategory) {
    // Find any category that contains system/alert channels
    const alertChannel = channels.find(c => c.name.includes('cảnh-báo'));
    if (alertChannel && alertChannel.parent_id) {
      targetCategory = channels.find(c => c.id === alertChannel.parent_id);
    }
  }

  log('📂', `Category target: ${targetCategory ? targetCategory.name : 'None — sẽ tạo ở top'}`);

  // Create DevOps channel
  const everyoneRole = await getEveryoneRoleId();

  const newChannel = await api.post(`/guilds/${guildId}/channels`, {
    name: '🛡️・devops-alerts',
    type: 0, // Text channel
    topic: '🛡️ Self-Healing DevOps Engine — Thông báo tự động phát hiện & sửa lỗi hệ thống. Chỉ Bot gửi.',
    parent_id: targetCategory ? targetCategory.id : null,
    permission_overwrites: [
      {
        id: everyoneRole, // @everyone
        type: 0, // role
        allow: '0',
        deny: String(PERMS.VIEW_CHANNEL | PERMS.SEND_MESSAGES),
      },
      {
        id: botId, // Bot
        type: 1, // member
        allow: String(
          PERMS.VIEW_CHANNEL | PERMS.SEND_MESSAGES | PERMS.EMBED_LINKS |
          PERMS.ATTACH_FILES | PERMS.READ_MESSAGE_HISTORY | PERMS.MENTION_EVERYONE |
          PERMS.MANAGE_MESSAGES | PERMS.USE_EXTERNAL_EMOJIS | PERMS.MANAGE_WEBHOOKS
        ),
        deny: '0',
      },
    ],
  });

  log('✅', `Đã tạo kênh DevOps: #${newChannel.data.name} (${newChannel.data.id})`);
  devopsChannel = newChannel.data;

  // Refresh channel list
  const updatedChansRes = await api.get(`/guilds/${guildId}/channels`);
  return { devopsChannel, allChannels: updatedChansRes.data };
}

async function getEveryoneRoleId() {
  const rolesRes = await api.get(`/guilds/${guildId}/roles`);
  const everyoneRole = rolesRes.data.find(r => r.name === '@everyone');
  return everyoneRole.id;
}

// ═══════════════════════════════════════
// STEP 3: Apply permissions to ALL channels
// ═══════════════════════════════════════
async function applyChannelPermissions(botId, allChannels) {
  logSection('STEP 3: Thiết lập quyền hạn cho tất cả kênh');

  const textChannels = allChannels.filter(c => c.type === 0);
  const everyoneRoleId = await getEveryoneRoleId();
  let successCount = 0;
  let failCount = 0;

  for (const channel of textChannels) {
    const profileName = getProfileForChannel(channel.name);
    const profile = CHANNEL_PROFILES[profileName];

    if (!profile) {
      log('⚠️', `Không tìm thấy profile cho #${channel.name} — bỏ qua`);
      continue;
    }

    try {
      // Set @everyone permissions
      await api.put(
        `/channels/${channel.id}/permissions/${everyoneRoleId}`,
        {
          type: 0, // role
          allow: String(profile.everyone.allow),
          deny: String(profile.everyone.deny),
        }
      );

      // Set Bot permissions
      await api.put(
        `/channels/${channel.id}/permissions/${botId}`,
        {
          type: 1, // member
          allow: String(profile.bot.allow),
          deny: String(profile.bot.deny),
        }
      );

      const statusIcon = {
        'ANNOUNCEMENT': '📢',
        'SECURITY_ALERT': '🔒',
        'DEVOPS_PRIVATE': '🛡️',
        'DATA_READONLY': '📊',
        'INTERACTIVE': '💬',
        'WELCOME': '👋',
      }[profileName] || '📋';

      log('✅', `${statusIcon} #${channel.name} → ${profileName} (${profile.description})`);
      successCount++;

      await sleep(500); // Avoid Discord rate limit
    } catch (err) {
      log('❌', `#${channel.name} — Lỗi: ${err.response?.data?.message || err.message}`);
      failCount++;
    }
  }

  console.log('');
  log('📊', `Kết quả: ${successCount} thành công, ${failCount} thất bại (${textChannels.length} kênh)`);

  return { successCount, failCount };
}

// ═══════════════════════════════════════
// STEP 4: Send permission summary to Discord
// ═══════════════════════════════════════
async function sendPermissionSummary(devopsChannel, allChannels, botId) {
  logSection('STEP 4: Gửi báo cáo quyền hạn vào Discord');

  const textChannels = allChannels.filter(c => c.type === 0);

  // Build summary table
  const channelList = textChannels.map(ch => {
    const profile = getProfileForChannel(ch.name);
    const icon = {
      'ANNOUNCEMENT': '📢', 'SECURITY_ALERT': '🔒', 'DEVOPS_PRIVATE': '🛡️',
      'DATA_READONLY': '📊', 'INTERACTIVE': '💬', 'WELCOME': '👋',
    }[profile] || '📋';
    const memberPerm = {
      'ANNOUNCEMENT': 'Chỉ đọc', 'SECURITY_ALERT': 'Chỉ đọc', 'DEVOPS_PRIVATE': 'Ẩn',
      'DATA_READONLY': 'Chỉ đọc', 'INTERACTIVE': '✅ Chat', 'WELCOME': 'Chỉ đọc',
    }[profile] || 'Chỉ đọc';

    return `${icon} <#${ch.id}> → **${profile}** (Member: ${memberPerm})`;
  }).join('\n');

  // Build cooldown table
  const cooldownInfo = Object.entries(NOTIFICATION_COOLDOWN).map(([severity, config]) => {
    const emoji = { CRITICAL: '🟣', ERROR: '🔴', WARNING: '🟡', INFO: '🟢' }[severity];
    return `${emoji} **${severity}** — ${config.description} (max ${config.maxPerHour}/giờ)`;
  }).join('\n');

  // Send to devops channel
  try {
    await api.post(`/channels/${devopsChannel.id}/messages`, {
      embeds: [
        {
          title: '🛡️ BÁO CÁO THIẾT LẬP QUYỀN HẠN KÊNH',
          description: 'Hệ thống Self-Healing DevOps đã thiết lập quyền hạn cho tất cả kênh Discord.',
          color: 0x2ECC71, // Green
          author: { name: '🔧 OCEANFORGE DEVOPS ADMIN' },
          fields: [
            {
              name: '📋 BẢNG QUYỀN HẠN KÊNH',
              value: channelList.substring(0, 1024),
              inline: false,
            },
            {
              name: '⏰ THỜI GIAN GỬI THÔNG BÁO (Cooldown)',
              value: cooldownInfo,
              inline: false,
            },
            {
              name: '📌 ROUTING THÔNG BÁO',
              value: [
                `🛡️ **DevOps Alerts** → <#${devopsChannel.id}>`,
                `🔒 **Security / Anti-Fraud** → Kênh #cảnh-báo-tài-khoản`,
                `🚀 **Deployment** → Kênh #thông-báo`,
              ].join('\n'),
              inline: false,
            },
            {
              name: '🔑 TỔNG KẾT QUYỀN HẠN',
              value: [
                '📢 **ANNOUNCEMENT** — Bot gửi, members chỉ đọc',
                '🔒 **SECURITY_ALERT** — Bot gửi cảnh báo, members chỉ xem',
                '🛡️ **DEVOPS_PRIVATE** — Ẩn với members, chỉ Admin/Bot',
                '📊 **DATA_READONLY** — Bot gửi dữ liệu, members xem + reaction',
                '💬 **INTERACTIVE** — Members chat được (không @everyone)',
                '👋 **WELCOME** — Bot gửi welcome, members chỉ đọc',
              ].join('\n'),
              inline: false,
            },
          ],
          footer: { text: 'OceanForge Self-Healing DevOps Engine • Channel Permission Setup' },
          timestamp: new Date().toISOString(),
        },
      ],
    });

    log('✅', 'Đã gửi báo cáo quyền hạn vào Discord');
  } catch (err) {
    log('❌', `Gửi báo cáo thất bại: ${err.response?.data?.message || err.message}`);
  }
}

// ═══════════════════════════════════════
// STEP 5: Set channel rate limit (slow mode)
// ═══════════════════════════════════════
async function setChannelSlowModes(allChannels) {
  logSection('STEP 5: Thiết lập Slow Mode cho các kênh tương tác');

  const textChannels = allChannels.filter(c => c.type === 0);

  // Slow mode config: seconds between messages for members
  const slowModeConfig = {
    'INTERACTIVE': 5,        // 5 giây — tránh spam nhưng vẫn thoải mái
    'DATA_READONLY': 0,      // Không cần — members không chat được
    'ANNOUNCEMENT': 0,       // Không cần
    'SECURITY_ALERT': 0,     // Không cần
    'DEVOPS_PRIVATE': 0,     // Không cần
    'WELCOME': 0,            // Không cần
  };

  for (const channel of textChannels) {
    const profile = getProfileForChannel(channel.name);
    const slowModeSeconds = slowModeConfig[profile] || 0;

    if (slowModeSeconds > 0) {
      try {
        await api.patch(`/channels/${channel.id}`, {
          rate_limit_per_user: slowModeSeconds,
        });
        log('⏱️', `#${channel.name} → Slow mode: ${slowModeSeconds}s`);
        await sleep(400);
      } catch (err) {
        log('⚠️', `#${channel.name} slow mode failed: ${err.response?.data?.message || err.message}`);
      }
    }
  }
}

// ═══════════════════════════════════════
// STEP 6: Update DevOps Notifier config
// ═══════════════════════════════════════
async function updateNotifierConfig(devopsChannel, allChannels) {
  logSection('STEP 6: Cập nhật DevOps Notifier routing config');

  // Find specific channels for routing
  const textChannels = allChannels.filter(c => c.type === 0);

  const securityChannel = textChannels.find(c =>
    c.name.includes('cảnh-báo') && !c.name.includes('devops')
  );
  const announcementChannel = textChannels.find(c =>
    c.name === 'thông-báo' || (c.name.includes('thông-báo') && !c.name.includes('cập-nhật'))
  );

  const routingConfig = {
    devops: devopsChannel.id,
    security: securityChannel ? securityChannel.id : devopsChannel.id,
    deployment: announcementChannel ? announcementChannel.id : devopsChannel.id,
  };

  log('📋', 'Notification routing:');
  log('🛡️', `  DevOps alerts    → #${devopsChannel.name} (${routingConfig.devops})`);
  log('🔒', `  Security alerts  → #${securityChannel?.name || devopsChannel.name} (${routingConfig.security})`);
  log('📢', `  Deploy notices   → #${announcementChannel?.name || devopsChannel.name} (${routingConfig.deployment})`);

  console.log('');
  log('⏰', 'Notification cooldown config:');
  Object.entries(NOTIFICATION_COOLDOWN).forEach(([severity, config]) => {
    const emoji = { CRITICAL: '🟣', ERROR: '🔴', WARNING: '🟡', INFO: '🟢' }[severity];
    log(emoji, `  ${severity}: ${config.description} (max ${config.maxPerHour}/giờ)`);
  });

  return routingConfig;
}

// ═══════════════════════════════════════
// MAIN
// ═══════════════════════════════════════
async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🛡️  OCEANFORGE DISCORD CHANNEL PERMISSION SETUP             ║');
  console.log('║  Thiết lập quyền hạn + thời gian thông báo cho tất cả kênh  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  try {
    // Step 1: Get bot & guild info
    const { botId, guild } = await getBotAndGuildInfo();

    // Step 2: Create DevOps channel if needed
    const { devopsChannel, allChannels } = await ensureDevOpsChannel(botId);

    // Step 3: Apply permissions to all channels
    const { successCount, failCount } = await applyChannelPermissions(botId, allChannels);

    // Step 4: Send summary to Discord
    await sendPermissionSummary(devopsChannel, allChannels, botId);

    // Step 5: Set slow modes
    await setChannelSlowModes(allChannels);

    // Step 6: Update notifier config
    const routingConfig = await updateNotifierConfig(devopsChannel, allChannels);

    // Final report
    logSection('📊 KẾT QUẢ CUỐI CÙNG');
    log('✅', `Channels configured: ${successCount}`);
    log('🛡️', `DevOps channel: #${devopsChannel.name}`);
    log('⏰', 'Cooldown: CRITICAL=0s | ERROR=2m | WARNING=5m | INFO=10m');
    log('🔒', 'Members: Không chat kênh thông báo, không @everyone');
    console.log('');
    log('🎉', '====== SETUP HOÀN TẤT ======');
    console.log('');

    process.exit(0);
  } catch (err) {
    console.error('');
    log('❌', `Setup failed: ${err.response?.data?.message || err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
