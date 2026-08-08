/**
 * Native Node 24 Discord Gateway Bot Client (Zero external dependencies besides Axios)
 * Connects to Discord Gateway WSS and handles all Slash Commands, Text Messages, and Channel Features.
 */

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();
const { handleBotCommand } = require('./index');
const publishBotCommandsChannelIntros = require('./sendBotCommandsChannelIntros');
const enforceStrictReadOnlyPermissions = require('./setExactChannelPermissions');
const { notifyInfo, notifyWarning, notifyError } = require('../utils/devopsNotifier');

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID || '1527320103476269076';

if (!token) {
  console.log('⚠️ DISCORD_BOT_TOKEN chưa được cài đặt trong backend/.env');
  process.exit(0);
}

const api = axios.create({
  baseURL: 'https://discord.com/api/v10',
  headers: {
    Authorization: `Bot ${token.trim()}`,
    'Content-Type': 'application/json',
  },
});

let sequence = null;
let sessionId = null;
let heartbeatInterval = null;
let hasPublishedIntros = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY_MS = 60000;
const channelNameCache = new Map();

/**
 * Reusable Embed Response Generator
 */
function buildEmbedResponse(commandName, options, res) {
  let title = `🤖 /${commandName}`;
  let description = '';
  let fields = [];
  let color = 0x06B6D4; // Default Cyan Glow
  let authorName = '✨ OCEANFORGE ROBLOX MANAGER';
  let footerText = '🛡️ OceanForge Account Manager System • Realtime Sync';

  if (!res.success && res.message) {
    color = 0xEF4444; // Red error
    title = `❌ Lỗi Thực Hiện Lệnh /${commandName}`;
    description = `> ${res.message}`;
  } else if (commandName === 'link') {
    title = '🧬 LIÊN KẾT TÀI KHOẢN DISCORD ➔ WEB DASHBOARD';
    color = 0x3B82F6; // Blue
    description = res.success 
      ? `🔑 **Mã xác thực của bạn:**\n# \` ${res.code} \`\n\n⏰ **Thời gian hiệu lực:** ${res.expiresIn}\n\n👉 *Vui lòng truy cập Web Dashboard ➔ Cài Đặt (Settings) ➔ Nhập mã này để hoàn tất liên kết!*`
      : `> ❌ ${res.message}`;
  } else if (commandName === 'apikey') {
    title = '🔑 THÔNG TIN API KEY & CẤU HÌNH ROBLOX LUA';
    color = 0xF59E0B; // Gold
    description = res.apiKey 
      ? `🔑 **Mã API Key của bạn:**\n\`\`\`${res.apiKey}\`\`\`\n` +
        `📜 **Đoạn Code Lua tự động dán vào Executor (Fluxus/Synapse/Delta/Wave):**\n` +
        `\`\`\`lua\ngetgenv().OceanForgeApiKey = "${res.apiKey}"\ngetgenv().OceanForgeServerUrl = "${res.serverUrl || 'https://quan-ly-acc-viet-nam.onrender.com'}"\nloadstring(game:HttpGet("${res.serverUrl || 'https://quan-ly-acc-viet-nam.onrender.com'}/api/templates/lua"))()\n\`\`\``
      : `> ⚠️ ${res.message}`;
    fields = [
      { name: '🟢 Trạng Thái', value: `\`${res.status || 'Active'}\``, inline: true },
      { name: '🆔 User Code', value: `\`${res.userCode || 'USR-DISCORD'}\``, inline: true },
      { name: '🌐 Server URL', value: `\`${res.serverUrl || 'https://quan-ly-acc-viet-nam.onrender.com'}\``, inline: true },
    ];
  } else if (commandName === 'createkey') {
    title = '🔑 TẠO MỚI API KEY THÀNH CÔNG';
    color = 0x10B981; // Green
    description = res.apiKey 
      ? `🔑 **API Key Mới Của Bạn:**\n\`\`\`${res.apiKey}\`\`\`\n` +
        `📜 **Đoạn Code Lua tự động dán vào Executor:**\n` +
        `\`\`\`lua\ngetgenv().OceanForgeApiKey = "${res.apiKey}"\ngetgenv().OceanForgeServerUrl = "${res.serverUrl || 'https://quan-ly-acc-viet-nam.onrender.com'}"\nloadstring(game:HttpGet("${res.serverUrl || 'https://quan-ly-acc-viet-nam.onrender.com'}/api/templates/lua"))()\n\`\`\``
      : `> ⚠️ ${res.message}`;
  } else if (commandName === 'deletekey') {
    title = '🗑️ XÓA API KEY THÀNH CÔNG';
    color = 0xEF4444; // Red
    description = res.message || 'Đã xóa thành công API Key của bạn!';
  } else if (commandName === 'admin') {
    title = '👑 HỆ THỐNG QUẢN TRỊ VIÊN';
    color = 0xA855F7; // Purple
    if (res.detail) {
      title = `👑 CHI TIẾT TÀI KHOẢN TỪ ADMIN`;
      fields = [
        { name: '👤 Chủ Sở Hữu', value: `**${res.detail.owner || 'Unknown'}**`, inline: true },
        { name: '🆔 User Code', value: `\`${res.detail.ownerCode || 'N/A'}\``, inline: true },
        { name: '⚡ Trạng Thái', value: res.detail.status === 'online' ? '🟢 Online' : '🔴 Offline', inline: true },
        { name: '💻 Thiết Bị', value: `\`${res.detail.device || 'Windows PC'}\``, inline: true },
        { name: '📅 Khởi Tạo', value: new Date(res.detail.created).toLocaleDateString('vi-VN'), inline: true },
      ];
    } else {
      fields = [
        { name: '👥 Tổng Người Dùng', value: `\`${res.totalUsers || 0}\` Thành viên`, inline: true },
        { name: '🟢 Trực Tuyến', value: `\`${res.online || 0}\` Online`, inline: true },
        { name: '🔴 Ngoại Tuyến', value: `\`${res.offline || 0}\` Offline`, inline: true },
      ];
    }
  } else if (commandName === 'profile' && res.profile) {
    const p = res.profile;
    title = `👤 HỒ SƠ IDENTITY: ${p.username.toUpperCase()}`;
    color = 0x06B6D4;
    fields = [
      { name: '🏷️ Biệt Danh Nội Bộ', value: `**${p.nickname || 'N/A'}**`, inline: true },
      { name: '🆔 User Code', value: `\`${p.userCode || 'N/A'}\``, inline: true },
      { name: '🔰 Vai Trò (Role)', value: `\`${p.role || 'Member'}\``, inline: true },
      { name: '📦 Roblox Accounts', value: `\`${p.totalAccounts}\` tài khoản`, inline: true },
      { name: '🟢 Đang Online', value: `\`${p.onlineAccounts}\` trực tuyến`, inline: true },
      { name: '🎮 Discord ID', value: `\`${p.discordId}\``, inline: true },
    ];
  } else if (commandName === 'accounts' && res.accounts) {
    title = `📜 DANH SÁCH TÀI KHOẢN ROBLOX (Trang ${res.page}/${res.totalPages})`;
    color = 0x10B981;
    description = res.accounts.length > 0
      ? res.accounts.map(a => `${a.status === 'online' ? '🟢' : '🔴'} **${a.index}. ${a.robloxUsername}** — Level \`${a.level}\` | Sea \`${a.sea}\``).join('\n')
      : 'Chưa có tài khoản Roblox nào kết nối.';
  } else if (commandName === 'account' && res.account) {
    const a = res.account;
    title = `🎮 BẢNG CHỈ SỐ TÀI KHOẢN: ${a.username.toUpperCase()}`;
    color = a.status === 'online' ? 0x10B981 : 0x64748B;
    fields = [
      { name: '⚔️ Level', value: `\`${a.level}\` / 2800`, inline: true },
      { name: '💵 Beli', value: `**$${a.beli.toLocaleString()}**`, inline: true },
      { name: '💎 Fragments', value: `**${a.fragments.toLocaleString()}**`, inline: true },
      { name: '🌊 Hải Trình (Sea)', value: `\`${a.sea}\``, inline: true },
      { name: '🍎 Trái Quỷ (Fruit)', value: `**${a.fruit}**`, inline: true },
      { name: '🗡️ Kiếm (Sword)', value: `**${a.sword}**`, inline: true },
      { name: '🥊 Thế Võ (Style)', value: `**${a.style}**`, inline: true },
      { name: '🔫 Súng (Gun)', value: `**${a.gun}**`, inline: true },
      { name: '⏱️ Runtime', value: `\`${a.runtime}\``, inline: true },
      { name: '⚡ Trạng Thái', value: a.status === 'online' ? '🟢 Online' : '🔴 Offline', inline: true },
    ];
  } else if (commandName === 'online' && res.summary) {
    title = '🌐 TRẠNG THÁI HỘI TÀI KHOẢN ROBLOX';
    color = 0x10B981;
    fields = [
      { name: '🟢 Trực Tuyến (Online)', value: `\`${res.summary.online}\` acc`, inline: true },
      { name: '🔴 Ngoại Tuyến (Offline)', value: `\`${res.summary.offline}\` acc`, inline: true },
      { name: '🟡 Lag / Reconnecting', value: `\`${res.summary.updating}\` acc`, inline: true },
      { name: '📦 Tổng Số Acc', value: `\`${res.summary.total}\` acc`, inline: true },
    ];
  } else if (commandName === 'runtime' && res.runtimes) {
    title = '⏱️ BẢNG THỜI GIAN CHẠY BOT (RUNTIME)';
    color = 0x3B82F6;
    description = res.runtimes.length > 0
      ? res.runtimes.map(r => `${r.status === 'online' ? '🟢' : '🔴'} **${r.username}**: \`${r.runtime}\``).join('\n')
      : 'Chưa ghi nhận runtime.';
  } else if (commandName === 'stats' && res.stats) {
    title = '📊 BẢNG THỐNG KÊ HỆ THỐNG TOÀN ĐỘI';
    color = 0xF59E0B;
    fields = [
      { name: '📦 Tổng Acc', value: `\`${res.stats.totalAccounts}\``, inline: true },
      { name: '🟢 Online', value: `\`${res.stats.online}\``, inline: true },
      { name: '🔴 Offline', value: `\`${res.stats.offline}\``, inline: true },
      { name: '💵 Tổng Beli', value: `**${res.stats.totalBeli}**`, inline: true },
      { name: '💎 Tổng Fragments', value: `**${res.stats.totalFragments}**`, inline: true },
      { name: '⏱️ Runtime TB', value: `\`${res.stats.avgRuntime}\``, inline: true },
    ];
  } else if (commandName === 'history' && res.history) {
    title = `📜 LỊCH SỬ TRẠNG THÁI: ${(res.username || 'ACCOUNT').toUpperCase()}`;
    description = res.history.map(h => `• \`${h.time}\` ➔ **${h.status}**`).join('\n');
  } else if (commandName === 'search' && res.accounts) {
    title = `🔍 TÌM KIẾM TÀI KHOẢN (${res.resultsCount} kết quả)`;
    description = res.accounts.length > 0
      ? res.accounts.map(a => `• ${a.status === 'online' ? '🟢' : '🔴'} **${a.username}** — Level \`${a.level}\` | Trái: \`${a.fruit}\` | Sea \`${a.sea}\``).join('\n')
      : 'Không tìm thấy tài khoản phù hợp.';
  } else if (commandName === 'logs' && res.logs) {
    title = `📋 NHẬT KÝ HOẠT ĐỘNG: ${(res.username || 'ACCOUNT').toUpperCase()}`;
    description = res.logs.map(l => `• \`${l}\``).join('\n');
  } else if (commandName === 'help') {
    title = '🤖 BẢNG PHÂN QUYỀN & DANH SÁCH LỆNH DISCORD BOT';
    color = 0x8B5CF6; // Purple glow
    description = 'Hệ thống đã phân chia quyền sử dụng theo từng Vai Trò (Roles) trên Discord & Web Dashboard:\n';
    fields = [
      { 
        name: '👑 1. CHỈ DÀNH CHO ADMIN / OWNER (QUẢN TRỊ VIÊN)', 
        value: '• **`/admin`**: Thống kê số lượng người dùng toàn hệ thống & tra cứu chi tiết chủ sở hữu tài khoản.\n*(Quyền hạn: Owner, Admin, Developer)*',
        inline: false 
      },
      { 
        name: '🛡️ 2. DÀNH CHO MODERATOR / VIP / PREMIUM', 
        value: '• **`/online`**: Xem tổng số tài khoản đang Online / Offline / Lag.\n• **`/stats`**: Thống kê tổng số Beli, Fragments & Runtime trung bình.\n• **`/runtime`**: Theo dõi thời gian cày bot của từng acc.\n• **`/search <từ_khóa>`**: Tìm kiếm tài khoản theo Level, Trái quỷ, Hải trình.',
        inline: false 
      },
      { 
        name: '👤 3. DÀNH CHO THÀNH VIÊN (MEMBER - TẤT CẢ NGƯỜI DÙNG)', 
        value: '• **`/link`**: Tạo mã xác thực 6 ký tự để liên kết Discord với Web Dashboard.\n• **`/profile`**: Xem User Code (`USR-XXXX`), Role, Biệt danh & số tài khoản cá nhân.\n• **`/accounts`**: Xem danh sách các tài khoản Roblox của bạn (có phân trang).\n• **`/account <username>`**: Xem chi tiết Level, Beli, Fragments, Trái quỷ, Kiếm, Võ, Súng của bạn.\n• **`/apikey`**: Kiểm tra trạng thái API Key cá nhân.\n• **`/history <username>`**: Xem lịch sử mốc thời gian Online/Offline.\n• **`/logs <username>`**: Xem nhật ký hoạt động gần nhất.',
        inline: false 
      },
    ];
  } else {
    description = res.message || 'Thao tác thành công!';
  }

  return {
    embeds: [{
      title,
      description,
      fields,
      color,
      author: { name: authorName },
      timestamp: new Date().toISOString(),
      footer: { text: footerText }
    }]
  };
}

function connectGateway() {
  console.log('📡 Đang kết nối tới Discord Gateway (WebSocket)...');
  const WebSocketClient = global.WebSocket || require('ws');
  const ws = new WebSocketClient('wss://gateway.discord.gg/?v=10&encoding=json');

  ws.onopen = () => {
    console.log('🌐 Kết nối WebSocket thành công!');
  };

  ws.onmessage = async (event) => {
    try {
      const payload = JSON.parse(event.data);
      const { op, d, s, t } = payload;

      if (s) sequence = s;

      switch (op) {
        case 10: { // Hello
          const interval = d.heartbeat_interval;
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          heartbeatInterval = setInterval(() => {
            if (ws.readyState === global.WebSocket.OPEN) {
              ws.send(JSON.stringify({ op: 1, d: sequence }));
            }
          }, interval);

          // Identify with standard intents (513 = Guilds + GuildMessages)
          ws.send(JSON.stringify({
            op: 2,
            d: {
              token: token.trim(),
              intents: 513,
              properties: {
                $os: 'windows',
                $browser: 'oceanforge_bot',
                $device: 'oceanforge_bot'
              }
            }
          }));
          break;
        }

        case 0: { // Dispatch Event
          if (t === 'READY') {
            sessionId = d.session_id;
            reconnectAttempts = 0; // Reset reconnect attempts on success
            console.log(`🤖 DISCORD BOT LIVE! Username: ${d.user.username}#${d.user.discriminator} (ID: ${d.user.id})`);
            console.log('✨ Sẵn sàng lắng nghe Slash Commands & Text Messages!');

            // Send notification to DevOps Notifier
            notifyInfo(
              'DiscordBotRunner',
              'Discord Bot Ready & Online',
              `Bot ${d.user.username}#${d.user.discriminator} kết nối thành công tới Discord Gateway.`,
              'Gateway WebSocket Listening'
            ).catch(() => {});
          }

          if (t === 'INTERACTION_CREATE') {
            handleInteraction(d);
          }

          if (t === 'MESSAGE_CREATE') {
            handleTextMessage(d);
          }

          if (t === 'GUILD_MEMBER_ADD') {
            handleNewMember(d);
          }
          break;
        }

        case 9: { // Invalid Session
          console.log('⚠️ Session invalid, reconnecting...');
          const delay = Math.min(5000 * Math.pow(1.5, reconnectAttempts), MAX_RECONNECT_DELAY_MS);
          reconnectAttempts++;
          setTimeout(connectGateway, delay);
          break;
        }
      }
    } catch (err) {
      console.error('Lỗi khi nhận WebSocket message:', err.message);
    }
  };

  ws.onerror = (err) => {
    console.error('WebSocket Error:', err.message || err);
  };

  ws.onclose = (event) => {
    const code = event ? (event.code || event) : 'unknown';
    const reason = event ? (event.reason || '') : '';
    reconnectAttempts++;
    const delay = Math.min(5000 * Math.pow(1.5, reconnectAttempts - 1), MAX_RECONNECT_DELAY_MS);
    
    console.log(`🔌 WebSocket ngắt kết nối (Code ${code}${reason ? ': ' + reason : ''}). Đang thử kết nối lại lần ${reconnectAttempts} sau ${Math.round(delay / 1000)}s...`);
    
    if (heartbeatInterval) clearInterval(heartbeatInterval);

    if (reconnectAttempts === 3) {
      notifyWarning(
        'DiscordBotRunner',
        'Mất Kết Nối Discord Gateway',
        `Bot đã bị ngắt kết nối WebSocket ${reconnectAttempts} lần liên tiếp (Code: ${code}). Đang tự động kết nối lại...`,
        { 'Lần thử': reconnectAttempts, 'Delay': `${Math.round(delay / 1000)}s` }
      ).catch(() => {});
    }

    setTimeout(connectGateway, delay);
  };
}

async function handleInteraction(interaction) {
  const { id, token: interactionToken, data, member, user } = interaction;
  if (!id || !interactionToken) return;

  const discordUser = user || (member ? member.user : null);
  const discordId = discordUser ? discordUser.id : '';
  const commandName = data ? data.name : '';

  const isEphemeral = ['link', 'apikey', 'createkey', 'deletekey'].includes(commandName);

  // 1. Send IMMEDIATE ACK (Type 5 - Deferred) within <50ms so Discord NEVER times out with "Ứng dụng không phản hồi"
  try {
    await api.post(`/interactions/${id}/${interactionToken}/callback`, {
      type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
      data: isEphemeral ? { flags: 64 } : {}
    });
  } catch (ackErr) {
    console.error('❌ Lỗi gửi ACK type 5 tới Discord:', ackErr.message);
  }

  try {
    // Parse options
    const options = {};
    if (data && data.options) {
      data.options.forEach(opt => {
        options[opt.name] = opt.value;
      });
    }

    // 2. Call REST API controller
    const res = await handleBotCommand(commandName, options, discordId);
    const embedPayload = buildEmbedResponse(commandName, options, res);

    // 3. Edit original deferred response message via Webhook PATCH endpoint
    await api.patch(`/webhooks/${clientId}/${interactionToken}/messages/@original`, {
      embeds: embedPayload.embeds
    });

  } catch (err) {
    console.error('❌ Lỗi xử lý Slash Command:', err.message);
    try {
      await api.patch(`/webhooks/${clientId}/${interactionToken}/messages/@original`, {
        embeds: [{
          title: '❌ LỖI THỰC HIỆN LỆNH',
          description: `> Lỗi hệ thống: ${err.message || 'Không thể phản hồi lệnh'}`,
          color: 0xEF4444
        }]
      });
    } catch (patchErr) {}
  }
}

/**
 * Handle incoming text messages in channels
 */
async function handleTextMessage(msg) {
  try {
    // Ignore bot messages
    if (!msg.author || msg.author.bot) return;

    const content = (msg.content || '').trim();
    if (!content) return;

    const discordId = msg.author.id;
    const channelId = msg.channel_id;

    // Fetch channel metadata to check name/context (cached)
    let chanName = channelNameCache.get(channelId) || '';
    if (!chanName) {
      try {
        const chanRes = await api.get(`/channels/${channelId}`);
        chanName = chanRes.data?.name || '';
        if (chanName) {
          channelNameCache.set(channelId, chanName);
        }
      } catch (e) {}
    }

    let commandName = null;
    let options = {};

    const lower = content.toLowerCase();

    // 1. Direct Prefix Commands (!link, /link, !profile, etc.)
    if (lower.startsWith('!') || lower.startsWith('/')) {
      const parts = content.slice(1).trim().split(/\s+/);
      commandName = parts[0].toLowerCase();
      const arg = parts.slice(1).join(' ');
      options = { query: arg, username: arg };
    }
    // 2. Text in Channel Context: #🧬・liên-kết-tài-khoản
    else if (chanName.includes('liên-kết-tài-khoản')) {
      commandName = 'link';
    }
    // 3. Text in Channel Context: #👾・tra-cứu-hồ-sơ
    else if (chanName.includes('tra-cứu-hồ-sơ')) {
      if (lower.startsWith('accounts') || lower.startsWith('danh sách')) {
        commandName = 'accounts';
      } else if (lower.startsWith('account') || lower.startsWith('acc ')) {
        commandName = 'account';
        options = { username: content.replace(/^(account|acc)\s+/i, '').trim() };
      } else if (lower.startsWith('apikey') || lower.startsWith('key')) {
        commandName = 'apikey';
      } else if (lower.startsWith('createkey')) {
        commandName = 'createkey';
      } else if (lower.startsWith('deletekey')) {
        commandName = 'deletekey';
      } else {
        // Default to profile or lookup account if argument provided
        if (content.length > 2 && !content.includes(' ')) {
          commandName = 'account';
          options = { username: content };
        } else {
          commandName = 'profile';
        }
      }
    }
    // 4. Text in Channel Context: #📈・thống-kê-chỉ-số
    else if (chanName.includes('thống-kê-chỉ-số')) {
      if (lower.startsWith('stats') || lower.startsWith('thống kê')) {
        commandName = 'stats';
      } else if (lower.startsWith('runtime') || lower.startsWith('thời gian')) {
        commandName = 'runtime';
      } else {
        commandName = 'online';
      }
    }
    // 5. Text in Channel Context: #🔍・tìm-kiếm-acc
    else if (chanName.includes('tìm-kiếm-acc')) {
      if (lower.startsWith('logs') || lower.startsWith('log ')) {
        commandName = 'logs';
        options = { username: content.replace(/^(logs|log)\s+/i, '').trim() };
      } else if (lower.startsWith('history') || lower.startsWith('lịch sử')) {
        commandName = 'history';
        options = { username: content.replace(/^(history|lịch sử)\s+/i, '').trim() };
      } else {
        commandName = 'search';
        options = { query: content.replace(/^search\s+/i, '').trim() };
      }
    }

    if (!commandName) return;

    // Call REST API controller
    const res = await handleBotCommand(commandName, options, discordId);
    const embedPayload = buildEmbedResponse(commandName, options, res);

    // Send Message directly to channel
    await api.post(`/channels/${channelId}/messages`, {
      content: `<@${discordId}>`,
      embeds: embedPayload.embeds
    });

  } catch (err) {
    console.error('❌ Lỗi xử lý Text Message:', err.message);
  }
}

async function handleNewMember(data) {
  try {
    const { guild_id, user } = data;
    if (!user) return;

    // Find welcome channel #👋・chào-mừng in guild
    const chansRes = await api.get(`/guilds/${guild_id}/channels`);
    const chans = chansRes.data || [];
    const welcomeChan = chans.find(c => c.type === 0 && (c.name.includes('chào-mừng') || c.name.includes('welcome')));

    if (welcomeChan) {
      const avatarUrl = user.avatar 
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : 'https://cdn.discordapp.com/embed/avatars/0.png';

      await api.post(`/channels/${welcomeChan.id}/messages`, {
        content: `🎉 Chào mừng <@${user.id}> đã gia nhập Server!`,
        embeds: [{
          title: '✨ CHÀO MỪNG THÀNH VIÊN MỚI THAM GIA OCEANFORGE!',
          description: `Rất vui được đón chào **<@${user.id}>** (\`${user.username}\`) đến với cộng đồng Quản Lý Tài Khoản!\n\n` +
            '📌 **HƯỚNG DẪN BẮT ĐẦU:**\n' +
            '1. Mở kênh **`#🧬・liên-kết-tài-khoản`**.\n' +
            '2. Gõ lệnh **`/link`** hoặc nhắn **`link`** để lấy Mã xác nhận 6 ký tự.\n' +
            '3. Mở **Web Dashboard** ➔ Cài Đặt ➔ Nhập mã để đồng bộ tài khoản!',
          color: 0xF59E0B, // Gold glow
          thumbnail: { url: avatarUrl },
          fields: [
            { name: '👤 Thành Viên', value: `<@${user.id}>`, inline: true },
            { name: '🔰 Quyền Hạn', value: '`🟢 Member`', inline: true },
            { name: '⏰ Thời Gian Gia Nhập', value: new Date().toLocaleTimeString('vi-VN'), inline: true },
          ],
          footer: { text: '🛡️ OceanForge SaaS Client • Tự Động Chào Mừng' },
          timestamp: new Date().toISOString()
        }]
      });
      console.log(`👋 Đã gửi lời chào mừng thành viên mới: ${user.username}`);
    }
  } catch (err) {
    console.error('Lỗi khi gửi thông báo chào mừng:', err.message);
  }
}

connectGateway();
