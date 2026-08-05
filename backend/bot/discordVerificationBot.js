/**
 * Discord Verification Bot — ᴠᴇʀɪғɪᴄᴀᴛɪᴏɴ System
 * Posts a "VERIFY NOW" embed + button in #✅・verification channel.
 * When a user clicks "Verify", the bot assigns the "Verified" role,
 * granting access to all other channels on the server.
 *
 * Flow:
 *  1. publishVerificationEmbed()  → sends the embed once to the channel
 *  2. handleVerifyInteraction()   → called when a user clicks the button
 */
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID || '1323888389870718977';

const api = token
  ? axios.create({
      baseURL: 'https://discord.com/api/v10',
      headers: {
        Authorization: `Bot ${token.trim()}`,
        'Content-Type': 'application/json',
      },
    })
  : null;

// ───────────────────────────────────────────────────────────────
// 1.  Publish the Verification Embed + Button into #✅・verification
// ───────────────────────────────────────────────────────────────
async function publishVerificationEmbed() {
  if (!api) {
    console.log('⚠️ DISCORD_BOT_TOKEN is missing — cannot publish verification embed.');
    return;
  }

  try {
    const chansRes = await api.get(`/guilds/${guildId}/channels`);
    const chans = chansRes.data || [];

    // Find the verification channel
    let verifyChan = chans.find(
      (c) => c.type === 0 && (c.name.includes('verification') || c.name.includes('xác-minh'))
    );

    if (!verifyChan) {
      console.log('⚠️ Không tìm thấy kênh #✅・verification trên Discord Server.');
      return;
    }

    // Build the embed — matching the ultra‑premium style in the screenshot
    const embed = {
      title: '🛡️ ᴠᴇʀɪғɪᴄᴀᴛɪᴏɴ — XÁC MINH THÀNH VIÊN',
      description:
        'Server này yêu cầu bạn phải **xác minh danh tính** trước khi truy cập các kênh khác.\n\n' +
        'Bạn chỉ cần **nhấn nút ✅ Verify bên dưới** để hoàn tất xác minh và mở khóa toàn bộ kênh trên máy chủ.\n',
      color: 0x22c55e, // Emerald Green — matches ✅ icon
      author: { name: '✨ OCEANFORGE SECURITY GATEWAY' },
      image: {
        url: 'https://cdn.discordapp.com/attachments/1101911985618792488/1323888389870718977/verify_banner.png',
      },
      fields: [
        {
          name: '📌 Hướng Dẫn',
          value:
            '1️⃣  Nhấn nút **✅ Verify** bên dưới.\n' +
            '2️⃣  Bot sẽ tự động gán role **Verified** cho bạn.\n' +
            '3️⃣  Tất cả các kênh sẽ được mở khóa ngay lập tức!',
          inline: false,
        },
        {
          name: '🛡️ Tại Sao Phải Xác Minh?',
          value:
            '• Bảo vệ cộng đồng khỏi spam bot & tài khoản giả mạo.\n' +
            '• Giữ cho Máy Chủ an toàn và chất lượng.',
          inline: false,
        },
      ],
      footer: { text: '🛡️ OceanForge Verification System • Bảo Mật 100%' },
      timestamp: new Date().toISOString(),
    };

    // Discord Interactive Message Components — Button Row
    const components = [
      {
        type: 1, // ACTION_ROW
        components: [
          {
            type: 2, // BUTTON
            style: 3, // SUCCESS (green)
            label: '✅ Verify',
            custom_id: 'oceanforge_verify_btn',
          },
          {
            type: 2,
            style: 5, // LINK
            label: '📖 Tutorial',
            url: 'https://manageblox.io.vn',
          },
        ],
      },
    ];

    await api.post(`/channels/${verifyChan.id}/messages`, {
      embeds: [embed],
      components,
    });

    console.log(`✅ [VERIFICATION BOT]: Đã đăng Embed xác minh vào kênh #${verifyChan.name}`);
  } catch (err) {
    console.error('❌ Lỗi khi đăng Embed xác minh:', err.response?.data || err.message);
  }
}

// ───────────────────────────────────────────────────────────────
// 2.  Handle "Verify" Button Interaction (called from Gateway or Webhook)
// ───────────────────────────────────────────────────────────────

/**
 * Ensure a "Verified" role exists in the guild. Create it if missing.
 * @returns {string|null} Role ID of the Verified role
 */
async function ensureVerifiedRole() {
  if (!api) return null;

  try {
    const rolesRes = await api.get(`/guilds/${guildId}/roles`);
    const roles = rolesRes.data || [];

    let verifiedRole = roles.find(
      (r) => r.name.toLowerCase() === 'verified' || r.name === '✅ Verified'
    );

    if (!verifiedRole) {
      // Create "✅ Verified" role with basic permissions
      const createRes = await api.post(`/guilds/${guildId}/roles`, {
        name: '✅ Verified',
        color: 0x22c55e, // Emerald Green
        hoist: false,
        mentionable: false,
        permissions: '0', // No extra perms — channel overrides grant access
      });
      verifiedRole = createRes.data;
      console.log(`🆕 Đã tạo role "✅ Verified" (ID: ${verifiedRole.id})`);
    }

    return verifiedRole.id;
  } catch (err) {
    console.error('❌ Lỗi khi tạo/lấy Verified role:', err.response?.data || err.message);
    return null;
  }
}

/**
 * Lock ALL channels for @everyone (deny VIEW_CHANNEL) and allow only for ✅ Verified role.
 * This should be run once after the verification system is set up.
 */
async function lockChannelsForUnverified() {
  if (!api) return;

  const verifiedRoleId = await ensureVerifiedRole();
  if (!verifiedRoleId) return;

  try {
    const chansRes = await api.get(`/guilds/${guildId}/channels`);
    const chans = chansRes.data || [];
    const everyoneRoleId = guildId; // @everyone role ID = guild ID

    // Channels that should remain visible to EVERYONE (unverified)
    const PUBLIC_KEYWORDS = ['verification', 'xác-minh', 'rules', 'nội-quy'];

    for (const chan of chans) {
      // Skip categories (type 4), voice channels (type 2), etc. — only text (0)
      if (chan.type !== 0) continue;

      const isPublic = PUBLIC_KEYWORDS.some((kw) => chan.name.includes(kw));

      if (isPublic) {
        // Public channels: @everyone CAN view but CANNOT send messages
        await api
          .put(`/channels/${chan.id}/permissions/${everyoneRoleId}`, {
            allow: '66560', // VIEW_CHANNEL + READ_MESSAGE_HISTORY
            deny: '2048', // SEND_MESSAGES
            type: 0,
          })
          .catch(() => {});
      } else {
        // Private channels: @everyone CANNOT view at all
        await api
          .put(`/channels/${chan.id}/permissions/${everyoneRoleId}`, {
            allow: '0',
            deny: '1024', // Deny VIEW_CHANNEL
            type: 0,
          })
          .catch(() => {});

        // ✅ Verified role CAN view + read + send + use commands
        await api
          .put(`/channels/${chan.id}/permissions/${verifiedRoleId}`, {
            allow: '2147551232', // VIEW + READ_HISTORY + SEND + USE_APP_COMMANDS
            deny: '0',
            type: 0,
          })
          .catch(() => {});
      }
    }

    console.log('🔒 Đã khóa toàn bộ kênh cho người chưa xác minh. Chỉ role ✅ Verified mới thấy kênh!');
  } catch (err) {
    console.error('❌ Lỗi khi khóa kênh cho unverified:', err.response?.data || err.message);
  }
}

/**
 * Handle the button click interaction from Discord Gateway / Interaction Endpoint.
 * Assigns ✅ Verified role to the clicking user.
 *
 * @param {string} userId - Discord User ID of the person who clicked Verify
 * @param {string} username - Username for logging
 * @returns {object} Result
 */
async function handleVerifyInteraction(userId, username) {
  if (!api || !userId) {
    return { success: false, message: 'Missing API client or userId' };
  }

  const verifiedRoleId = await ensureVerifiedRole();
  if (!verifiedRoleId) {
    return { success: false, message: 'Không thể tạo/lấy role Verified.' };
  }

  try {
    // Check if user already has the role
    const memberRes = await api.get(`/guilds/${guildId}/members/${userId}`);
    const memberRoles = memberRes.data?.roles || [];

    if (memberRoles.includes(verifiedRoleId)) {
      return {
        success: true,
        alreadyVerified: true,
        message: '✅ Bạn đã được xác minh trước đó rồi! Tất cả kênh đã mở khóa.',
      };
    }

    // Assign ✅ Verified role
    await api.put(`/guilds/${guildId}/members/${userId}/roles/${verifiedRoleId}`);

    console.log(`✅ [VERIFY]: Đã xác minh thành công ${username} (${userId})`);

    return {
      success: true,
      alreadyVerified: false,
      message: `✅ Xác minh thành công! Chào mừng **${username}** — tất cả các kênh trên máy chủ đã được mở khóa cho bạn.`,
    };
  } catch (err) {
    console.error('❌ Lỗi khi gán Verified role:', err.response?.data || err.message);
    return {
      success: false,
      message: 'Lỗi khi xác minh. Vui lòng thử lại hoặc liên hệ Admin.',
    };
  }
}

// ───────────────────────────────────────────────────────────────
// CLI — run directly with `node discordVerificationBot.js`
// ───────────────────────────────────────────────────────────────
if (require.main === module) {
  (async () => {
    console.log('🚀 Đang thiết lập hệ thống Verification cho Discord Server...\n');

    // Step 1: Ensure Verified role exists
    const roleId = await ensureVerifiedRole();
    console.log(`   Role ID: ${roleId}\n`);

    // Step 2: Lock channels for unverified users
    await lockChannelsForUnverified();

    // Step 3: Publish the verification embed
    await publishVerificationEmbed();

    console.log('\n🎉 Hoàn tất thiết lập hệ thống ᴠᴇʀɪғɪᴄᴀᴛɪᴏɴ!');
  })();
}

module.exports = {
  publishVerificationEmbed,
  ensureVerifiedRole,
  lockChannelsForUnverified,
  handleVerifyInteraction,
};
