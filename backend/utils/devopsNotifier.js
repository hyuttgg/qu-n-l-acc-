/**
 * OceanForge DevOps Notifier
 * ──────────────────────────────────────
 * Hệ thống thông báo DevOps chuyên dụng qua Discord.
 * Hỗ trợ severity levels, rate limiting, và rich embed messages.
 * 
 * Severity Levels:
 *   INFO     🟢 — Thông tin bình thường (auto-fix thành công)
 *   WARNING  🟡 — Cảnh báo (đang tiến hành auto-fix)
 *   ERROR    🔴 — Lỗi (auto-fix thất bại, cần chú ý)
 *   CRITICAL 🟣 — Nghiêm trọng (circuit breaker mở, cần can thiệp thủ công)
 */

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// ═══════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════

const SEVERITY = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
};

const SEVERITY_CONFIG = {
  INFO: { color: 0x2ECC71, emoji: '🟢', label: 'THÔNG TIN' },
  WARNING: { color: 0xF39C12, emoji: '🟡', label: 'CẢNH BÁO' },
  ERROR: { color: 0xE74C3C, emoji: '🔴', label: 'LỖI' },
  CRITICAL: { color: 0x9B59B6, emoji: '🟣', label: 'NGHIÊM TRỌNG' },
};

// Rate limiting: max 10 alerts per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const alertTimestamps = [];

// Discord API setup
const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID || '1323888389870718977';

const discordApi = token ? axios.create({
  baseURL: 'https://discord.com/api/v10',
  headers: {
    Authorization: `Bot ${token.trim()}`,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
}) : null;

// Cache for DevOps alert channel
let cachedAlertChannelId = null;

// ═══════════════════════════════════════
// RATE LIMITER
// ═══════════════════════════════════════

function isRateLimited() {
  const now = Date.now();
  // Remove timestamps older than the window
  while (alertTimestamps.length > 0 && alertTimestamps[0] < now - RATE_LIMIT_WINDOW_MS) {
    alertTimestamps.shift();
  }
  return alertTimestamps.length >= RATE_LIMIT_MAX;
}

function recordAlert() {
  alertTimestamps.push(Date.now());
}

// ═══════════════════════════════════════
// CHANNEL DISCOVERY
// ═══════════════════════════════════════

/**
 * Find or create a DevOps alert channel in Discord
 */
async function getAlertChannelId() {
  if (cachedAlertChannelId) return cachedAlertChannelId;
  if (!discordApi) return null;

  try {
    const res = await discordApi.get(`/guilds/${guildId}/channels`);
    const channels = res.data || [];

    // Priority: devops-alerts > devops > cảnh-báo > thông-báo > general
    let channel = channels.find(c => c.type === 0 && c.name.includes('devops-alerts'));
    if (!channel) channel = channels.find(c => c.type === 0 && c.name.includes('devops'));
    if (!channel) channel = channels.find(c => c.type === 0 && c.name.includes('cảnh-báo'));
    if (!channel) channel = channels.find(c => c.type === 0 && c.name.includes('thông-báo'));
    if (!channel) channel = channels.find(c => c.type === 0 && c.name === 'general');

    if (channel) {
      cachedAlertChannelId = channel.id;
      return channel.id;
    }
  } catch (err) {
    console.error('[DevOpsNotifier] Failed to discover Discord channel:', err.message);
  }

  return null;
}

// ═══════════════════════════════════════
// NOTIFICATION HISTORY (in-memory ring buffer)
// ═══════════════════════════════════════

const MAX_HISTORY = 100;
const notificationHistory = [];

function addToHistory(notification) {
  notificationHistory.push(notification);
  if (notificationHistory.length > MAX_HISTORY) {
    notificationHistory.shift();
  }
}

function getNotificationHistory() {
  return [...notificationHistory];
}

// ═══════════════════════════════════════
// CORE NOTIFICATION FUNCTION
// ═══════════════════════════════════════

/**
 * Send a DevOps alert notification to Discord
 * 
 * @param {object} params
 * @param {string} params.severity — INFO | WARNING | ERROR | CRITICAL
 * @param {string} params.service — Affected service name (e.g., 'MongoDB', 'MySQL', 'PM2')
 * @param {string} params.title — Short title of the incident
 * @param {string} params.description — Detailed description
 * @param {string} params.action — Auto-remediation action taken
 * @param {string} params.result — Result of the action ('SUCCESS' | 'FAILED' | 'PENDING')
 * @param {string} [params.errorStack] — Error stack trace (optional)
 * @param {object} [params.metrics] — Additional metrics (optional)
 */
async function sendDevOpsAlert({
  severity = SEVERITY.INFO,
  service = 'Unknown',
  title = 'DevOps Alert',
  description = '',
  action = 'N/A',
  result = 'PENDING',
  errorStack = null,
  metrics = null,
}) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.INFO;
  const timestamp = new Date().toISOString();

  // Build notification record
  const notification = {
    id: `INC-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    severity,
    service,
    title,
    description,
    action,
    result,
    timestamp,
    errorStack: errorStack ? errorStack.substring(0, 500) : null,
    metrics,
  };

  // Always add to history regardless of Discord delivery
  addToHistory(notification);

  // Console log
  const logPrefix = `[DevOps ${config.emoji} ${config.label}]`;
  const logMsg = `${logPrefix} [${service}] ${title}: ${description} | Action: ${action} | Result: ${result}`;
  
  if (severity === SEVERITY.CRITICAL || severity === SEVERITY.ERROR) {
    console.error(logMsg);
  } else if (severity === SEVERITY.WARNING) {
    console.warn(logMsg);
  } else {
    console.log(logMsg);
  }

  // Rate limit check
  if (isRateLimited()) {
    console.warn('[DevOpsNotifier] Rate limited — skipping Discord notification');
    return notification;
  }

  // Send to Discord
  if (!discordApi) return notification;

  try {
    const channelId = await getAlertChannelId();
    if (!channelId) return notification;

    recordAlert();

    // Build embed fields
    const fields = [
      { name: '🔧 Dịch Vụ', value: `\`${service}\``, inline: true },
      { name: `${config.emoji} Mức Độ`, value: `\`${config.label}\``, inline: true },
      { name: '📋 Kết Quả', value: `\`${result}\``, inline: true },
      { name: '⚡ Hành Động Tự Sửa', value: `> ${action}`, inline: false },
    ];

    if (description) {
      fields.push({ name: '📝 Chi Tiết', value: description.substring(0, 1024), inline: false });
    }

    if (errorStack) {
      fields.push({
        name: '🐛 Error Stack',
        value: `\`\`\`\n${errorStack.substring(0, 900)}\n\`\`\``,
        inline: false,
      });
    }

    if (metrics) {
      const metricsStr = Object.entries(metrics)
        .map(([k, v]) => `• **${k}**: \`${v}\``)
        .join('\n');
      fields.push({ name: '📊 Metrics', value: metricsStr.substring(0, 1024), inline: false });
    }

    // Ping @everyone only for CRITICAL
    const pingContent = severity === SEVERITY.CRITICAL
      ? '@everyone 🚨 **DEVOPS CRITICAL ALERT — CẦN CAN THIỆP NGAY!**'
      : '';

    await discordApi.post(`/channels/${channelId}/messages`, {
      content: pingContent,
      embeds: [{
        title: `${config.emoji} ${title}`,
        color: config.color,
        author: { name: '🛡️ OCEANFORGE SELF-HEALING DEVOPS ENGINE' },
        fields,
        footer: {
          text: `Incident ID: ${notification.id} • OceanForge DevOps Engine`,
        },
        timestamp,
      }],
    });

  } catch (err) {
    console.error('[DevOpsNotifier] Discord send failed:', err.message);
  }

  return notification;
}

// ═══════════════════════════════════════
// CONVENIENCE METHODS
// ═══════════════════════════════════════

async function notifyAutoFixSuccess(service, title, action) {
  return sendDevOpsAlert({
    severity: SEVERITY.INFO,
    service,
    title,
    description: 'Hệ thống tự động phát hiện và sửa lỗi thành công.',
    action,
    result: '✅ SUCCESS',
  });
}

async function notifyAutoFixAttempt(service, title, action) {
  return sendDevOpsAlert({
    severity: SEVERITY.WARNING,
    service,
    title,
    description: 'Đang tiến hành tự động sửa lỗi...',
    action,
    result: '⏳ IN PROGRESS',
  });
}

async function notifyAutoFixFailed(service, title, action, errorStack) {
  return sendDevOpsAlert({
    severity: SEVERITY.ERROR,
    service,
    title,
    description: 'Tự động sửa lỗi thất bại. Cần kiểm tra thủ công.',
    action,
    result: '❌ FAILED',
    errorStack,
  });
}

async function notifyCircuitBreakerOpen(service, title, retryCount) {
  return sendDevOpsAlert({
    severity: SEVERITY.CRITICAL,
    service,
    title: `CIRCUIT BREAKER OPEN — ${title}`,
    description: `Đã thử sửa lỗi ${retryCount} lần nhưng thất bại liên tục. Circuit breaker đã mở — dừng auto-fix. **Cần can thiệp thủ công ngay!**`,
    action: 'Auto-fix đã bị vô hiệu hóa cho service này',
    result: '🔒 CIRCUIT BREAKER OPEN',
    metrics: { 'Số lần thử': retryCount, 'Trạng thái': 'Chờ can thiệp thủ công' },
  });
}

async function notifyDeploymentResult({ success, commitHash, branch, error, rolledBack }) {
  const severity = success ? SEVERITY.INFO : (rolledBack ? SEVERITY.WARNING : SEVERITY.ERROR);
  const title = success
    ? '🚀 Deployment Thành Công'
    : (rolledBack ? '⏪ Deployment Thất Bại — Đã Auto-Rollback' : '❌ Deployment Thất Bại');

  return sendDevOpsAlert({
    severity,
    service: 'CI/CD Pipeline',
    title,
    description: success
      ? `Deploy commit \`${commitHash || 'unknown'}\` trên branch \`${branch || 'main'}\` thành công.`
      : `Deploy thất bại. ${rolledBack ? 'Đã tự động rollback về commit trước.' : 'Cần kiểm tra thủ công.'}`,
    action: success ? 'Deploy + Health Check' : (rolledBack ? 'Auto-Rollback' : 'Đang chờ xử lý'),
    result: success ? '✅ SUCCESS' : (rolledBack ? '⏪ ROLLED BACK' : '❌ FAILED'),
    errorStack: error || null,
    metrics: {
      'Commit': commitHash || 'N/A',
      'Branch': branch || 'N/A',
      'Rolled Back': rolledBack ? 'Có' : 'Không',
    },
  });
}

// ═══════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════

module.exports = {
  SEVERITY,
  sendDevOpsAlert,
  notifyAutoFixSuccess,
  notifyAutoFixAttempt,
  notifyAutoFixFailed,
  notifyCircuitBreakerOpen,
  notifyDeploymentResult,
  getNotificationHistory,
};
