/**
 * Automated Discord Guild Setup Script
 * Creates Roles, Categories, Text Channels, and Registers Slash Commands automatically.
 * 
 * Usage:
 * DISCORD_BOT_TOKEN=your_bot_token node backend/bot/setupGuild.js
 */

const { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID || '1527320103476269076';
const targetGuildId = process.env.DISCORD_GUILD_ID;

if (!token) {
  console.log('⚠️ [CẢNH BÁO]: Chưa có DISCORD_BOT_TOKEN trong file backend/.env!');
  console.log('Vui lòng tạo Bot Token từ Discord Developer Portal và thêm vào .env:');
  console.log('DISCORD_BOT_TOKEN=your_bot_token_here');
  console.log('DISCORD_GUILD_ID=your_server_id_here (tùy chọn)\n');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

// Roles definition
const ROLES = [
  { name: '👑 Owner', color: 0xF59E0B, permissions: [PermissionFlagsBits.Administrator] },
  { name: '🟣 Admin', color: 0xA855F7, permissions: [PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageChannels] },
  { name: '🛡️ Moderator', color: 0x06B6D4, permissions: [PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers, PermissionFlagsBits.ManageMessages] },
  { name: '🚀 Developer', color: 0xEC4899, permissions: [PermissionFlagsBits.ManageWebhooks] },
  { name: '💎 Premium', color: 0x0EA5E9, permissions: [] },
  { name: '⚡ VIP', color: 0xF97316, permissions: [] },
  { name: '🟢 Member', color: 0x10B981, permissions: [] },
];

// Structure of Categories and Channels
const STRUCTURE = [
  {
    category: '📢 THÔNG BÁO HỆ THỐNG',
    channels: [
      { name: 'thông-báo', topic: 'Kênh thông báo chính thức từ Admin' },
      { name: 'cập-nhật-hệ-thống', topic: 'Nhật ký nâng cấp tính năng Web Dashboard & Discord Bot' }
    ]
  },
  {
    category: '🤖 LỆNH DISCORD BOT',
    channels: [
      { name: 'liên-kết-tài-khoản', topic: 'Gõ /link để lấy mã xác thực liên kết tài khoản Discord với Website' },
      { name: 'tra-cứu-hồ-sơ', topic: 'Dùng lệnh /profile, /accounts, /account để xem thông tin' },
      { name: 'thống-kê-chỉ-số', topic: 'Dùng lệnh /online, /stats, /runtime để theo dõi hệ thống' },
      { name: 'tìm-kiếm-acc', topic: 'Dùng lệnh /search, /logs, /history để tra cứu nâng cao' }
    ]
  },
  {
    category: '⚠️ CẢNH BÁO TỰ ĐỘNG',
    channels: [
      { name: 'cảnh-báo-tài-khoản', topic: 'Kênh tự động phát cảnh báo khi tài khoản Roblox lag hoặc mất kết nối' }
    ]
  },
  {
    category: '💬 THẢO LUẬN CHUNG',
    channels: [
      { name: 'trò-chuyện-chung', topic: 'Kênh giao lưu thành viên' },
      { name: 'hỗ-trợ-kỹ-thuật', topic: 'Hỏi đáp kỹ thuật & báo lỗi' }
    ]
  }
];

// Slash commands definition
const slashCommands = [
  new SlashCommandBuilder().setName('link').setDescription('Tạo mã liên kết tài khoản Discord với Website Dashboard'),
  new SlashCommandBuilder().setName('profile').setDescription('Xem thông tin User Identity, Role, và thống kê số tài khoản'),
  new SlashCommandBuilder().setName('accounts').setDescription('Xem danh sách các tài khoản Roblox của bạn'),
  new SlashCommandBuilder().setName('account').setDescription('Xem chi tiết 1 tài khoản Roblox').addStringOption(opt => opt.setName('username').setDescription('Tên tài khoản Roblox').setRequired(true)),
  new SlashCommandBuilder().setName('online').setDescription('Xem tình trạng Online / Offline / Updating'),
  new SlashCommandBuilder().setName('runtime').setDescription('Xem tổng thời gian chạy bot của từng tài khoản'),
  new SlashCommandBuilder().setName('stats').setDescription('Xem tổng số Beli, Fragments và chỉ số chung'),
  new SlashCommandBuilder().setName('apikey').setDescription('Kiểm tra trạng thái API Key'),
  new SlashCommandBuilder().setName('history').setDescription('Xem lịch sử trạng thái Online').addStringOption(opt => opt.setName('username').setDescription('Tên tài khoản Roblox').setRequired(true)),
  new SlashCommandBuilder().setName('search').setDescription('Tìm kiếm tài khoản').addStringOption(opt => opt.setName('query').setDescription('Từ khóa tìm kiếm')),
  new SlashCommandBuilder().setName('logs').setDescription('Xem nhật ký hoạt động').addStringOption(opt => opt.setName('username').setDescription('Tên tài khoản Roblox').setRequired(true)),
  new SlashCommandBuilder().setName('admin').setDescription('(Admin) Quản lý hệ thống người dùng và tài khoản'),
  new SlashCommandBuilder().setName('help').setDescription('Hiển thị tất cả lệnh hỗ trợ')
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
  console.log(`🚀 Đã đăng nhập vào Discord bằng Bot: ${client.user.tag}`);

  // Fetch target guild
  let guild = null;
  if (targetGuildId) {
    guild = await client.guilds.fetch(targetGuildId).catch(() => null);
  }
  if (!guild) {
    guild = client.guilds.cache.first();
  }

  if (!guild) {
    console.error('❌ Không tìm thấy Server nào mà Bot đã tham gia. Hãy mời Bot vào Server trước!');
    process.exit(1);
  }

  console.log(`📌 Đang tự động cấu hình Server: "${guild.name}" (ID: ${guild.id})...\n`);

  // 1. Register Slash Commands
  try {
    const rest = new REST({ version: '10' }).setToken(token);
    console.log('⏳ Đang đăng ký 13 Slash Commands lên Discord...');
    await rest.put(Routes.applicationGuildCommands(clientId, guild.id), { body: slashCommands });
    console.log('✅ Đăng ký Slash Commands thành công!');
  } catch (err) {
    console.error('❌ Lỗi khi đăng ký Slash Commands:', err.message);
  }

  // 2. Create Roles
  console.log('\n⏳ Đang tự động tạo các Vai trò (Roles)...');
  for (const roleDef of ROLES) {
    const existing = guild.roles.cache.find(r => r.name === roleDef.name);
    if (!existing) {
      try {
        await guild.roles.create({
          name: roleDef.name,
          color: roleDef.color,
          permissions: roleDef.permissions,
          hoist: true,
          reason: 'Automated setup by OceanForge setup script'
        });
        console.log(`  + Đã tạo Role: ${roleDef.name}`);
      } catch (err) {
        console.error(`  - Không thể tạo Role ${roleDef.name}:`, err.message);
      }
    } else {
      console.log(`  = Role đã tồn tại: ${roleDef.name}`);
    }
  }

  // 3. Create Categories and Channels
  console.log('\n⏳ Đang tự động tạo Danh mục & Kênh chữ (Channels)...');
  for (const catDef of STRUCTURE) {
    let categoryChannel = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === catDef.category);
    if (!categoryChannel) {
      try {
        categoryChannel = await guild.channels.create({
          name: catDef.category,
          type: ChannelType.GuildCategory,
        });
        console.log(`  📂 Đã tạo Danh mục: ${catDef.category}`);
      } catch (e) {
        console.error(`  - Lỗi tạo danh mục ${catDef.category}:`, e.message);
      }
    }

    for (const chanDef of catDef.channels) {
      const existingChan = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.name === chanDef.name);
      if (!existingChan) {
        try {
          const createdChan = await guild.channels.create({
            name: chanDef.name,
            type: ChannelType.GuildText,
            parent: categoryChannel ? categoryChannel.id : null,
            topic: chanDef.topic,
          });
          console.log(`    # Đã tạo Kênh: #${chanDef.name}`);

          // Welcome message in link channel
          if (chanDef.name === 'liên-kết-tài-khoản') {
            const embed = new EmbedBuilder()
              .setTitle('🔗 HƯỚNG DẪN LIÊN KẾT TÀI KHOẢN DISCORD VỚI WEB DASHBOARD')
              .setDescription('Để liên kết tài khoản Discord của bạn với hệ thống Quản Lý Tài Khoản:\n\n' +
                '1. Gõ lệnh **`/link`** ngay tại kênh này.\n' +
                '2. Bot sẽ gửi cho bạn **Mã Xác Thực** 6 ký tự (có hiệu lực trong 5 phút).\n' +
                '3. Mở **Web Dashboard** ➔ Nhập mã xác nhận để hoàn tất liên kết!\n\n' +
                '✨ Sau khi liên kết, bạn có thể tra cứu thông số tài khoản Roblox trực tiếp trên Discord!')
              .setColor(0x06B6D4);
            await createdChan.send({ embeds: [embed] });
          }

          if (chanDef.name === 'thông-báo') {
            const embed = new EmbedBuilder()
              .setTitle('🎉 CHÀO MỪNG BẠN ĐẾN VỚI HỆ THỐNG OCEANFORGE BOT')
              .setDescription('Hệ thống Discord Server đã được tự động cấu hình hoàn chỉnh!\n\n' +
                '• **Kênh Lệnh Bot:** Tra cứu thông số, kiểm tra status, runtime\n' +
                '• **Kênh Cảnh Báo:** Tự động phát thông báo khi tài khoản ngắt kết nối\n' +
                '• **Phân Quyền Roles:** Đồng bộ 100% với hệ thống Web Identity\n')
              .setColor(0xF59E0B);
            await createdChan.send({ embeds: [embed] });
          }

        } catch (e) {
          console.error(`    - Lỗi tạo kênh #${chanDef.name}:`, e.message);
        }
      } else {
        console.log(`    = Kênh đã tồn tại: #${chanDef.name}`);
      }
    }
  }

  console.log('\n🎉 TỰ ĐỘNG THAO TÁC CẤU HÌNH SERVER DISCORD HOÀN TẤT!');
  console.log('👉 Bây giờ bạn có thể mở Discord và kiểm tra toàn bộ Kênh, Vai trò và Lệnh Slash!');
  process.exit(0);
});

client.login(token).catch(err => {
  console.error('❌ Không thể đăng nhập Bot:', err.message);
  process.exit(1);
});
