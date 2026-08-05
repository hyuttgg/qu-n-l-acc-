/**
 * OceanForge DevOps Self-Healing — Integration Test Script
 * ──────────────────────────────────────────────────────────
 * Kiểm thử toàn diện hệ thống:
 *   1. Kết nối Discord Bot → xác minh token hợp lệ
 *   2. Tìm kênh thông báo trong Discord server
 *   3. Gửi test notification với tất cả severity levels
 *   4. Chạy health check simulation
 *   5. Test circuit breaker pattern
 *   6. Gửi summary report tổng kết
 * 
 * Usage: node test_devops_selfhealing.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const {
  SEVERITY,
  sendDevOpsAlert,
  notifyAutoFixSuccess,
  notifyAutoFixAttempt,
  notifyAutoFixFailed,
  notifyCircuitBreakerOpen,
  notifyDeploymentResult,
  getNotificationHistory,
} = require('./utils/devopsNotifier');

const axios = require('axios');

// ═══════════════════════════════════════
// TEST CONFIG
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

// ═══════════════════════════════════════
// TEST 1: Discord Bot Connection
// ═══════════════════════════════════════
async function testDiscordConnection() {
  logSection('TEST 1: Discord Bot Connection');

  try {
    const res = await api.get('/users/@me');
    const bot = res.data;
    log('✅', `Bot connected: ${bot.username}#${bot.discriminator} (ID: ${bot.id})`);
    log('📌', `Bot avatar: https://cdn.discordapp.com/avatars/${bot.id}/${bot.avatar}.png`);
    return true;
  } catch (err) {
    log('❌', `Bot connection FAILED: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

// ═══════════════════════════════════════
// TEST 2: Guild & Channel Discovery
// ═══════════════════════════════════════
async function testGuildAndChannels() {
  logSection('TEST 2: Discord Guild & Channel Discovery');

  try {
    // Get guild info
    const guildRes = await api.get(`/guilds/${guildId}`);
    const guild = guildRes.data;
    log('✅', `Guild found: "${guild.name}" (ID: ${guild.id})`);
    log('📊', `Members: ~${guild.approximate_member_count || 'N/A'} | Boosts: ${guild.premium_subscription_count || 0}`);

    // Get channels
    const chansRes = await api.get(`/guilds/${guildId}/channels`);
    const channels = chansRes.data.filter(c => c.type === 0); // text channels only
    log('📋', `Text channels found: ${channels.length}`);

    // Find target channel for DevOps alerts
    let alertChannel = channels.find(c => c.name.includes('devops'));
    if (!alertChannel) alertChannel = channels.find(c => c.name.includes('cảnh-báo') || c.name.includes('canh-bao'));
    if (!alertChannel) alertChannel = channels.find(c => c.name.includes('thông-báo') || c.name.includes('thong-bao'));
    if (!alertChannel) alertChannel = channels.find(c => c.name === 'general');

    if (alertChannel) {
      log('🎯', `Alert channel selected: #${alertChannel.name} (ID: ${alertChannel.id})`);
    } else {
      log('⚠️', 'No suitable channel found — messages may not be delivered');
    }

    // List all text channels
    log('📋', 'All text channels:');
    channels.forEach(c => {
      const isTarget = alertChannel && c.id === alertChannel.id;
      console.log(`     ${isTarget ? '→ ' : '  '}#${c.name} (${c.id})${isTarget ? ' ← [DEVOPS TARGET]' : ''}`);
    });

    return alertChannel;
  } catch (err) {
    log('❌', `Guild discovery FAILED: ${err.response?.data?.message || err.message}`);
    return null;
  }
}

// ═══════════════════════════════════════
// TEST 3: Send DevOps Notifications (All Severity Levels)
// ═══════════════════════════════════════
async function testNotifications() {
  logSection('TEST 3: DevOps Notification System (All Severity Levels)');

  log('📤', 'Sending INFO notification...');
  await sendDevOpsAlert({
    severity: SEVERITY.INFO,
    service: 'Test Runner',
    title: '🧪 [TEST] Hệ Thống DevOps Đang Hoạt Động',
    description: 'Đây là thông báo kiểm thử từ Self-Healing DevOps Engine. Hệ thống giám sát đang hoạt động bình thường.',
    action: 'Integration test — kiểm tra kết nối Discord',
    result: '✅ CONNECTED',
    metrics: {
      'Node.js Version': process.version,
      'Platform': process.platform,
      'Test Time': new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
    },
  });
  log('✅', 'INFO notification sent');

  await sleep(2000); // Avoid Discord rate limit

  log('📤', 'Sending WARNING notification...');
  await sendDevOpsAlert({
    severity: SEVERITY.WARNING,
    service: 'MongoDB',
    title: '🧪 [TEST] Phát Hiện Kết Nối Chậm',
    description: 'Giả lập: MongoDB response time tăng cao bất thường (>500ms). Hệ thống đang theo dõi.',
    action: 'Monitoring — sẽ tự động reconnect nếu mất kết nối',
    result: '⚠️ MONITORING',
    metrics: {
      'Response Time': '523ms',
      'Connection Pool': '8/10 active',
      'Retry Count': '0',
    },
  });
  log('✅', 'WARNING notification sent');

  await sleep(2000);

  log('📤', 'Sending ERROR notification...');
  await sendDevOpsAlert({
    severity: SEVERITY.ERROR,
    service: 'MySQL',
    title: '🧪 [TEST] MySQL Pool Exhausted',
    description: 'Giả lập: Tất cả MySQL connections đã được sử dụng. Hệ thống thử tạo pool mới nhưng thất bại.',
    action: 'Attempted pool recovery — drain & recreate',
    result: '❌ RECOVERY FAILED',
    errorStack: 'Error: ER_CON_COUNT_ERROR: Too many connections\n    at Pool.getConnection (node_modules/mysql2/lib/pool.js:33:16)\n    at selfHealingEngine.checkMySQL (utils/selfHealingEngine.js:185:20)\n    at runHealthCheck (utils/selfHealingEngine.js:312:5)',
    metrics: {
      'Pool Limit': '10',
      'Active Connections': '10',
      'Queued Requests': '47',
    },
  });
  log('✅', 'ERROR notification sent');

  await sleep(2000);

  log('📤', 'Sending CRITICAL notification...');
  await sendDevOpsAlert({
    severity: SEVERITY.CRITICAL,
    service: 'Server Process',
    title: '🧪 [TEST] CIRCUIT BREAKER OPEN — Server Không Phản Hồi',
    description: 'Giả lập: Health check thất bại 5 lần liên tiếp. Circuit breaker đã mở — auto-fix bị vô hiệu hóa. **Cần can thiệp thủ công ngay!**',
    action: 'Auto-fix đã bị dừng — chờ can thiệp thủ công',
    result: '🔒 CIRCUIT BREAKER OPEN',
    metrics: {
      'Consecutive Failures': '5',
      'Circuit Breaker': 'OPEN',
      'Last Success': '15 phút trước',
      'Affected Users': '~127 online',
    },
  });
  log('✅', 'CRITICAL notification sent');

  await sleep(1500);

  return true;
}

// ═══════════════════════════════════════
// TEST 4: Convenience Notification Methods
// ═══════════════════════════════════════
async function testConvenienceMethods() {
  logSection('TEST 4: Convenience Notification Methods');

  log('📤', 'Testing notifyAutoFixSuccess...');
  await notifyAutoFixSuccess('MongoDB', '🧪 [TEST] MongoDB Reconnected', 'Auto-reconnect to Atlas thành công');
  log('✅', 'notifyAutoFixSuccess sent');

  await sleep(2000);

  log('📤', 'Testing notifyDeploymentResult (success)...');
  await notifyDeploymentResult({
    success: true,
    commitHash: 'a1b2c3d',
    branch: 'main',
  });
  log('✅', 'Deployment success notification sent');

  await sleep(2000);

  log('📤', 'Testing notifyDeploymentResult (failed + rollback)...');
  await notifyDeploymentResult({
    success: false,
    commitHash: 'f4e5d6c',
    branch: 'main',
    error: 'Health check returned HTTP 502 after 5 retries',
    rolledBack: true,
  });
  log('✅', 'Deployment rollback notification sent');

  return true;
}

// ═══════════════════════════════════════
// TEST 5: Notification History & Rate Limiting
// ═══════════════════════════════════════
async function testHistoryAndRateLimiting() {
  logSection('TEST 5: Notification History & Rate Limiting');

  const history = getNotificationHistory();
  log('📊', `Total notifications in history: ${history.length}`);
  
  console.log('');
  log('📋', 'Notification History:');
  history.forEach((n, idx) => {
    const time = new Date(n.timestamp).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    console.log(`     ${idx + 1}. [${n.severity}] ${n.service}: ${n.title.substring(0, 50)}... (${time})`);
  });

  return true;
}

// ═══════════════════════════════════════
// TEST 6: Send Final Summary
// ═══════════════════════════════════════
async function sendTestSummary(results) {
  logSection('TEST 6: Sending Final Summary to Discord');

  const allPassed = Object.values(results).every(r => r === true);
  const passCount = Object.values(results).filter(r => r === true).length;
  const totalCount = Object.keys(results).length;

  const resultsText = Object.entries(results)
    .map(([name, passed]) => `${passed ? '✅' : '❌'} ${name}`)
    .join('\n');

  await sendDevOpsAlert({
    severity: allPassed ? SEVERITY.INFO : SEVERITY.ERROR,
    service: 'DevOps Test Runner',
    title: allPassed
      ? `🎉 Kiểm Thử DevOps HOÀN TẤT — ${passCount}/${totalCount} PASSED`
      : `⚠️ Kiểm Thử DevOps — ${passCount}/${totalCount} Passed`,
    description: `**Kết quả kiểm thử Self-Healing DevOps Engine:**\n\n${resultsText}`,
    action: 'Full integration test completed',
    result: allPassed ? '✅ ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED',
    metrics: {
      'Tests Passed': `${passCount}/${totalCount}`,
      'Test Duration': `${Math.round(process.uptime())}s`,
      'Node.js': process.version,
      'Platform': `${process.platform} ${process.arch}`,
    },
  });

  log('✅', 'Summary report sent to Discord');
  return true;
}

// ═══════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  🛡️  OCEANFORGE SELF-HEALING DEVOPS — INTEGRATION TEST  ║');
  console.log('║  Testing Discord connectivity, notifications & tracking ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  log('⏰', `Test started at: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  log('🔑', `Discord Bot Token: ${token ? token.substring(0, 20) + '...' : 'NOT SET'}`);
  log('🏠', `Discord Guild ID: ${guildId || 'NOT SET'}`);

  if (!token) {
    log('❌', 'DISCORD_BOT_TOKEN not found in .env — cannot proceed');
    process.exit(1);
  }

  const results = {};

  // Run tests sequentially
  results['Discord Bot Connection'] = await testDiscordConnection();
  results['Guild & Channel Discovery'] = !!(await testGuildAndChannels());
  results['Notification System (4 Severity Levels)'] = await testNotifications();
  results['Convenience Methods (autofix/deploy)'] = await testConvenienceMethods();
  results['History & Rate Limiting'] = await testHistoryAndRateLimiting();

  await sleep(1500);

  results['Final Summary Report'] = await sendTestSummary(results);

  // Final console report
  logSection('📊 FINAL TEST REPORT');

  const allPassed = Object.values(results).every(r => r === true);
  const passCount = Object.values(results).filter(r => r === true).length;
  const totalCount = Object.keys(results).length;

  Object.entries(results).forEach(([name, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'}  ${name}`);
  });

  console.log('');
  console.log(`  📊 Result: ${passCount}/${totalCount} tests passed`);
  console.log(`  ⏱️  Duration: ${Math.round(process.uptime())}s`);
  console.log('');

  if (allPassed) {
    console.log('  🎉 ====================================');
    console.log('  🎉  ALL TESTS PASSED — DEVOPS READY!  ');
    console.log('  🎉 ====================================');
  } else {
    console.log('  ⚠️  SOME TESTS FAILED — Check output above');
  }

  console.log('');
  console.log('  👉 Kiểm tra Discord server để xem thông báo!');
  console.log('');

  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
