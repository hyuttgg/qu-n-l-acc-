/**
 * Live Discord Bot Client Handler using discord.js
 * Run with: DISCORD_BOT_TOKEN=your_token node backend/bot/runner.js
 */

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { handleBotCommand, COMMANDS, startDiscordAlertMonitor } = require('./index');
require('dotenv').config();

const token = process.env.DISCORD_BOT_TOKEN;
const alertChannelId = process.env.DISCORD_ALERT_CHANNEL_ID;

if (!token) {
  console.log('⚠️ DISCORD_BOT_TOKEN chưa được thiết lập trong backend/.env');
  console.log('Bot đang ở chế độ REST API Bridge (không chạy Client Gateway trực tiếp).');
  process.exit(0);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once('ready', () => {
  console.log(`🤖 Discord Bot đã đăng nhập thành công với tên: ${client.user.tag}`);
  console.log(`📡 Sẵn sàng lắng nghe ${COMMANDS.length} lệnh Slash Commands!`);

  // Start background alert monitor
  if (alertChannelId) {
    startDiscordAlertMonitor(async (alert) => {
      try {
        const channel = await client.channels.fetch(alertChannelId);
        if (channel && channel.isTextBased()) {
          const embed = new EmbedBuilder()
            .setTitle(alert.title)
            .setDescription(alert.message)
            .setColor(alert.type === 'WARNING' ? 0xF59E0B : 0xEF4444)
            .setTimestamp();
          await channel.send({ embeds: [embed] });
        }
      } catch (e) {
        console.error('Lỗi khi gửi thông báo cảnh báo đến Discord:', e.message);
      }
    });
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, user } = interaction;
  await interaction.deferReply({ ephemeral: commandName === 'link' || commandName === 'apikey' });

  const opts = {};
  options.data.forEach(opt => {
    if (opt.value !== undefined) opts[opt.name] = opt.value;
  });

  const res = await handleBotCommand(commandName, opts, user.id);

  if (!res.success) {
    return await interaction.editReply({
      content: `❌ **Lỗi:** ${res.message || 'Thao tác không thành công.'}`
    });
  }

  // Format responses nicely with Embeds
  const embed = new EmbedBuilder()
    .setColor(0x06B6D4) // Cyan glow color
    .setTimestamp();

  if (commandName === 'link') {
    embed.setTitle('🔗 Liên Kết Tài Khoản Web Dashboard')
      .setDescription(`Mã xác thực của bạn: **\`${res.code}\`**\n*${res.expiresIn}*`)
      .setFooter({ text: 'Nhập mã này trên giao diện Dashboard để liên kết.' });
  } else if (commandName === 'profile' && res.profile) {
    embed.setTitle(`👤 Hồ Sơ Người Dùng: ${res.profile.username}`)
      .addFields(
        { name: 'Biệt danh', value: res.profile.nickname || 'N/A', inline: true },
        { name: 'User Code', value: `\`${res.profile.userCode}\``, inline: true },
        { name: 'Role', value: `\`${res.profile.role}\``, inline: true },
        { name: 'Tổng số tài khoản', value: `${res.profile.totalAccounts}`, inline: true },
        { name: 'Tài khoản Online', value: `${res.profile.onlineAccounts}`, inline: true },
        { name: 'Discord ID', value: `\`${res.profile.discordId}\``, inline: true }
      );
  } else if (commandName === 'online' && res.summary) {
    embed.setTitle('🌐 Tình Trạng Tài Khoản Roblox')
      .addFields(
        { name: '🟢 Online', value: `${res.summary.online}`, inline: true },
        { name: '🔴 Offline', value: `${res.summary.offline}`, inline: true },
        { name: '🟡 Updating / Lag', value: `${res.summary.updating}`, inline: true }
      );
  } else if (commandName === 'stats' && res.stats) {
    embed.setTitle('📊 Thống Kê Tổng Quan Hệ Thống')
      .addFields(
        { name: 'Tổng số tài khoản', value: `${res.stats.totalAccounts}`, inline: true },
        { name: 'Online', value: `${res.stats.online}`, inline: true },
        { name: 'Offline', value: `${res.stats.offline}`, inline: true },
        { name: 'Tổng Beli', value: `${res.stats.totalBeli}`, inline: true },
        { name: 'Tổng Fragments', value: `${res.stats.totalFragments}`, inline: true },
        { name: 'Runtime Trung Bình', value: `${res.stats.avgRuntime}`, inline: true }
      );
  } else {
    embed.setTitle(`🤖 Kết quả /${commandName}`)
      .setDescription('```json\n' + JSON.stringify(res, null, 2).substring(0, 1900) + '\n```');
  }

  await interaction.editReply({ embeds: [embed] });
});

client.login(token).catch(err => {
  console.error('❌ Không thể đăng nhập Discord Bot Token:', err.message);
});
