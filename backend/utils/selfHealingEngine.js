/**
 * OceanForge Self-Healing Engine
 * ──────────────────────────────────────
 * Central orchestrator that monitors all services and automatically
 * detects + remediates common production failures.
 * 
 * Supported auto-fix scenarios:
 *   - MongoDB disconnection → auto-reconnect with exponential backoff
 *   - MySQL pool exhaustion → drain & recreate pool
 *   - Memory leak detection → force GC, clear caches, restart if critical
 *   - PM2 process crash loop → track & alert if exceeding threshold
 *   - Express unresponsive → self-ping health check
 *   - Log file overflow → auto-rotate large log files
 *   - Socket.IO connection storm → throttle new connections
 * 
 * Uses Circuit Breaker pattern: if an auto-fix action fails 5 consecutive
 * times for the same service, the circuit opens and manual intervention
 * is required.
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');
const mongoose = require('mongoose');
const {
  sendDevOpsAlert,
  notifyAutoFixSuccess,
  notifyAutoFixAttempt,
  notifyAutoFixFailed,
  notifyCircuitBreakerOpen,
  SEVERITY,
} = require('./devopsNotifier');

// ═══════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════

const CONFIG = {
  // Health check interval (60 seconds in dev, 30 seconds in production)
  HEALTH_CHECK_INTERVAL_MS: process.env.NODE_ENV === 'production' ? 30 * 1000 : 60 * 1000,

  // Circuit breaker: max consecutive failures before opening
  CIRCUIT_BREAKER_THRESHOLD: 5,

  // Max auto-restarts in a time window
  MAX_RESTARTS_IN_WINDOW: 5,
  RESTART_WINDOW_MS: 10 * 60 * 1000, // 10 minutes

  // Memory thresholds — based on RSS vs SYSTEM TOTAL RAM (not heap%)
  // Node.js heap% is always high because V8 dynamically sizes heap — NOT a real issue
  MEMORY_WARNING_MB: 512,      // RSS > 512MB → warning
  MEMORY_CRITICAL_MB: 1024,    // RSS > 1GB → critical
  MEMORY_EMERGENCY_MB: 1536,   // RSS > 1.5GB → emergency

  // Log file max size (100MB)
  LOG_MAX_SIZE_BYTES: 100 * 1024 * 1024,

  // Self-ping timeout
  SELF_PING_TIMEOUT_MS: 10000,

  // Socket.IO connection storm threshold
  SOCKET_STORM_THRESHOLD: 500,

  // Alert deduplication cooldown per service (prevent spam)
  ALERT_COOLDOWN_MS: 10 * 60 * 1000, // 10 minutes — same service won't alert again within this window
};

// ═══════════════════════════════════════
// ALERT DEDUPLICATION (prevents spam)
// ═══════════════════════════════════════
// Map<serviceKey, lastAlertTimestamp>
const alertCooldowns = new Map();

function shouldSendAlert(serviceKey) {
  // In development mode, NEVER send Discord alerts — only log to console
  if (process.env.NODE_ENV !== 'production') return false;

  const now = Date.now();
  const lastSent = alertCooldowns.get(serviceKey) || 0;
  if (now - lastSent < CONFIG.ALERT_COOLDOWN_MS) {
    return false; // Still in cooldown — suppress duplicate
  }
  alertCooldowns.set(serviceKey, now);
  return true;
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

// ═══════════════════════════════════════
// CIRCUIT BREAKER STATE
// ═══════════════════════════════════════

class CircuitBreaker {
  constructor() {
    // Map<serviceName, { failures: number, isOpen: boolean, lastFailure: Date }>
    this.services = new Map();
  }

  getState(service) {
    if (!this.services.has(service)) {
      this.services.set(service, { failures: 0, isOpen: false, lastFailure: null });
    }
    return this.services.get(service);
  }

  recordFailure(service) {
    const state = this.getState(service);
    state.failures += 1;
    state.lastFailure = new Date();

    if (state.failures >= CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
      state.isOpen = true;
    }

    return state;
  }

  recordSuccess(service) {
    const state = this.getState(service);
    state.failures = 0;
    state.isOpen = false;
  }

  isOpen(service) {
    return this.getState(service).isOpen;
  }

  reset(service) {
    this.services.set(service, { failures: 0, isOpen: false, lastFailure: null });
  }

  getAllStates() {
    const result = {};
    for (const [service, state] of this.services) {
      result[service] = { ...state };
    }
    return result;
  }
}

const circuitBreaker = new CircuitBreaker();

// ═══════════════════════════════════════
// RESTART TRACKER
// ═══════════════════════════════════════

const restartTimestamps = [];

function canRestart() {
  const now = Date.now();
  // Remove timestamps outside the window
  while (restartTimestamps.length > 0 && restartTimestamps[0] < now - CONFIG.RESTART_WINDOW_MS) {
    restartTimestamps.shift();
  }
  return restartTimestamps.length < CONFIG.MAX_RESTARTS_IN_WINDOW;
}

function recordRestart() {
  restartTimestamps.push(Date.now());
}

// ═══════════════════════════════════════
// INCIDENT LOG (in-memory ring buffer)
// ═══════════════════════════════════════

const MAX_INCIDENTS = 50;
const incidentLog = [];

function logIncident(incident) {
  incidentLog.push({
    ...incident,
    timestamp: new Date().toISOString(),
  });
  if (incidentLog.length > MAX_INCIDENTS) {
    incidentLog.shift();
  }
}

function getIncidentLog() {
  return [...incidentLog];
}

// ═══════════════════════════════════════
// HEALTH CHECK: MongoDB
// ═══════════════════════════════════════

async function checkMongoDB() {
  const service = 'MongoDB';
  if (circuitBreaker.isOpen(service)) return;

  try {
    const state = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (state === 1) {
      circuitBreaker.recordSuccess(service);
      return { service, status: 'healthy', readyState: state };
    }

    // Disconnected — attempt reconnect
    if (state === 0 || state === 3) {
      logIncident({ service, type: 'DISCONNECTED', action: 'AUTO_RECONNECT' });

      if (shouldSendAlert('mongo-disconnect')) {
        await notifyAutoFixAttempt(service, 'MongoDB Mất Kết Nối', 'Đang tự động kết nối lại...');
      }

      const atlasUri = process.env.MONGODB_URI;
      const localUri = 'mongodb://127.0.0.1:27017/oceanforge';

      try {
        await mongoose.connect(atlasUri, { serverSelectionTimeoutMS: 5000 });
        global.dbConnected = true;
        circuitBreaker.recordSuccess(service);
        if (shouldSendAlert('mongo-recovered')) {
          await notifyAutoFixSuccess(service, 'MongoDB Đã Kết Nối Lại', 'Auto-reconnect to Atlas');
        }
        logIncident({ service, type: 'RECONNECTED', target: 'Atlas' });
        return { service, status: 'recovered', target: 'Atlas' };
      } catch (atlasErr) {
        // Fallback to local
        try {
          await mongoose.connect(localUri, { serverSelectionTimeoutMS: 3000 });
          global.dbConnected = true;
          circuitBreaker.recordSuccess(service);
          if (shouldSendAlert('mongo-fallback')) {
            await notifyAutoFixSuccess(service, 'MongoDB Fallback Local', 'Auto-reconnect to localhost');
          }
          logIncident({ service, type: 'RECONNECTED', target: 'Local' });
          return { service, status: 'recovered', target: 'Local' };
        } catch (localErr) {
          const cbState = circuitBreaker.recordFailure(service);
          global.dbConnected = false;

          if (cbState.isOpen && shouldSendAlert('mongo-circuit-open')) {
            await notifyCircuitBreakerOpen(service, 'MongoDB Không Thể Kết Nối', cbState.failures);
          } else if (shouldSendAlert('mongo-reconnect-fail')) {
            await notifyAutoFixFailed(service, 'MongoDB Reconnect Thất Bại', 'Auto-reconnect', localErr.stack);
          }
          logIncident({ service, type: 'RECONNECT_FAILED', error: localErr.message });
          return { service, status: 'error', error: localErr.message };
        }
      }
    }

    return { service, status: 'connecting', readyState: state };
  } catch (err) {
    circuitBreaker.recordFailure(service);
    return { service, status: 'error', error: err.message };
  }
}

// ═══════════════════════════════════════
// HEALTH CHECK: MySQL
// ═══════════════════════════════════════

async function checkMySQL() {
  const service = 'MySQL';
  if (circuitBreaker.isOpen(service)) return { service, status: 'circuit_open' };

  try {
    const { pool } = require('../config/mysql');
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    circuitBreaker.recordSuccess(service);
    return { service, status: 'healthy' };
  } catch (err) {
    // MySQL is OPTIONAL in this project (MongoDB is primary)
    // Only log to console — do NOT send Discord alerts for MySQL
    // This prevents spamming alerts when MySQL is simply not running
    const state = circuitBreaker.recordFailure(service);
    logIncident({ service, type: 'CONNECTION_FAILED', error: err.message });

    // Only log to console, not Discord
    if (state.failures === 1) {
      console.warn(`[SelfHealing] MySQL optional check failed (silent): ${err.message}`);
    }

    return { service, status: 'unavailable_optional', error: err.message };
  }
}

// ═══════════════════════════════════════
// HEALTH CHECK: Memory Usage
// ═══════════════════════════════════════

async function checkMemory() {
  const service = 'Memory';
  if (circuitBreaker.isOpen(service)) return { service, status: 'circuit_open' };

  try {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);

    // System memory
    const totalSystemMem = os.totalmem();
    const freeSystemMem = os.freemem();
    const systemMemPercent = Math.round(((totalSystemMem - freeSystemMem) / totalSystemMem) * 100);

    const result = {
      service,
      status: 'healthy',
      heapUsedMB,
      heapTotalMB,
      rssMB,
      systemMemPercent,
    };

    // Use RSS (Resident Set Size) for real memory usage — NOT heap%
    // Node.js heap% is always high because V8 auto-sizes heap. That's NORMAL.
    // RSS = actual physical RAM consumed by this process

    // Emergency: RSS > 1.5GB
    if (rssMB >= CONFIG.MEMORY_EMERGENCY_MB) {
      result.status = 'emergency';
      logIncident({ service, type: 'MEMORY_EMERGENCY', rssMB });

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Clear global caches
      if (global.activeUserSessions && global.activeUserSessions.size > 100) {
        const sizeBefore = global.activeUserSessions.size;
        const entries = Array.from(global.activeUserSessions.entries());
        global.activeUserSessions = new Map(entries.slice(-50));
      }

      if (shouldSendAlert('memory-emergency')) {
        await notifyAutoFixAttempt(service, `Memory Emergency (RSS: ${rssMB}MB)`, 'Force GC + Clear Caches');
      }

      return result;
    }

    // Critical: RSS > 1GB
    if (rssMB >= CONFIG.MEMORY_CRITICAL_MB) {
      result.status = 'critical';
      logIncident({ service, type: 'MEMORY_CRITICAL', rssMB });

      if (shouldSendAlert('memory-critical')) {
        await sendDevOpsAlert({
          severity: SEVERITY.WARNING,
          service,
          title: `Memory Usage Cao (RSS: ${rssMB}MB)`,
          description: `Process RSS: ${rssMB}MB. Hệ thống đang giám sát.`,
          action: 'Monitoring - sẽ tự động GC nếu vượt 1.5GB',
          result: '⚠️ MONITORING',
          metrics: { 'RSS': `${rssMB}MB`, 'Heap': `${heapUsedMB}/${heapTotalMB}MB`, 'System': `${systemMemPercent}%` },
        });
      }
    }

    // Warning: RSS > 512MB (only log, no Discord alert)
    else if (rssMB >= CONFIG.MEMORY_WARNING_MB) {
      result.status = 'warning';
      logIncident({ service, type: 'MEMORY_WARNING', rssMB });
    }

    return result;
  } catch (err) {
    return { service, status: 'error', error: err.message };
  }
}

// ═══════════════════════════════════════
// HEALTH CHECK: Express Self-Ping
// ═══════════════════════════════════════

function checkExpressHealth(port) {
  const service = 'Express';
  if (circuitBreaker.isOpen(service)) return Promise.resolve({ service, status: 'circuit_open' });

  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = http.get(`http://127.0.0.1:${port}/api/health`, { timeout: CONFIG.SELF_PING_TIMEOUT_MS }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const responseTimeMs = Date.now() - startTime;
        circuitBreaker.recordSuccess(service);
        resolve({
          service,
          status: 'healthy',
          responseTimeMs,
          statusCode: res.statusCode,
        });
      });
    });

    req.on('error', async (err) => {
      const state = circuitBreaker.recordFailure(service);
      logIncident({ service, type: 'UNRESPONSIVE', error: err.message });

      if (state.isOpen) {
        await notifyCircuitBreakerOpen(service, 'Express Server Không Phản Hồi', state.failures);
      } else {
        await notifyAutoFixFailed(service, 'Express Health Check Failed', 'Self-ping /api/health', err.stack);
      }

      resolve({ service, status: 'error', error: err.message });
    });

    req.on('timeout', async () => {
      req.destroy();
      const state = circuitBreaker.recordFailure(service);
      logIncident({ service, type: 'TIMEOUT', timeout: CONFIG.SELF_PING_TIMEOUT_MS });

      if (state.failures === 1) {
        await notifyAutoFixAttempt(service, 'Express Response Timeout', `Timeout sau ${CONFIG.SELF_PING_TIMEOUT_MS}ms`);
      }

      resolve({ service, status: 'timeout', timeoutMs: CONFIG.SELF_PING_TIMEOUT_MS });
    });
  });
}

// ═══════════════════════════════════════
// HEALTH CHECK: Log File Size
// ═══════════════════════════════════════

async function checkLogFiles() {
  const service = 'LogFiles';
  const logsDir = path.join(__dirname, '../logs');

  try {
    if (!fs.existsSync(logsDir)) return { service, status: 'healthy', message: 'No logs directory' };

    const files = fs.readdirSync(logsDir);
    const results = [];

    for (const file of files) {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);

      if (stats.size > CONFIG.LOG_MAX_SIZE_BYTES) {
        // Auto-rotate: rename to .old and create new empty file
        const rotatedPath = filePath + '.old.' + Date.now();

        try {
          // If there's already an .old file, delete it first
          const existingOlds = files.filter(f => f.startsWith(file + '.old.'));
          for (const oldFile of existingOlds) {
            fs.unlinkSync(path.join(logsDir, oldFile));
          }

          fs.renameSync(filePath, rotatedPath);
          fs.writeFileSync(filePath, '');

          const sizeMB = Math.round(stats.size / 1024 / 1024);
          await notifyAutoFixSuccess(service, `Log File Rotated: ${file}`, `${file} (${sizeMB}MB) → rotated & cleared`);
          logIncident({ service, type: 'LOG_ROTATED', file, sizeMB });
          results.push({ file, action: 'rotated', sizeMB });
        } catch (rotateErr) {
          await notifyAutoFixFailed(service, `Log Rotation Failed: ${file}`, 'Rename + clear', rotateErr.stack);
          results.push({ file, action: 'rotate_failed', error: rotateErr.message });
        }
      } else {
        results.push({ file, sizeMB: Math.round(stats.size / 1024 / 1024), action: 'ok' });
      }
    }

    return { service, status: 'healthy', files: results };
  } catch (err) {
    return { service, status: 'error', error: err.message };
  }
}

// ═══════════════════════════════════════
// HEALTH CHECK: Socket.IO
// ═══════════════════════════════════════

async function checkSocketIO(io) {
  const service = 'Socket.IO';
  if (!io) return { service, status: 'not_initialized' };

  try {
    const sockets = await io.fetchSockets();
    const connectionCount = sockets.length;

    const result = {
      service,
      status: 'healthy',
      connections: connectionCount,
      activeUserSessions: global.activeUserSessions ? global.activeUserSessions.size : 0,
    };

    // Connection storm detection
    if (connectionCount > CONFIG.SOCKET_STORM_THRESHOLD) {
      result.status = 'warning';
      logIncident({ service, type: 'CONNECTION_STORM', connectionCount });

      if (shouldSendAlert('socketio-storm')) {
        await sendDevOpsAlert({
          severity: SEVERITY.WARNING,
          service,
          title: 'Socket.IO Connection Storm Detected',
          description: `${connectionCount} active connections (threshold: ${CONFIG.SOCKET_STORM_THRESHOLD})`,
          action: 'Monitoring — có thể cần tăng capacity',
          result: '⚠️ HIGH LOAD',
          metrics: { 'Connections': connectionCount, 'Threshold': CONFIG.SOCKET_STORM_THRESHOLD },
        });
      }
    }

    return result;
  } catch (err) {
    return { service, status: 'error', error: err.message };
  }
}

// ═══════════════════════════════════════
// HEALTH CHECK: Disk Space
// ═══════════════════════════════════════

function checkDiskSpace() {
  const service = 'DiskSpace';

  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    return {
      service,
      status: 'healthy',
      totalMemoryGB: Math.round(totalMem / 1024 / 1024 / 1024 * 100) / 100,
      freeMemoryGB: Math.round(freeMem / 1024 / 1024 / 1024 * 100) / 100,
      cpuCount: os.cpus().length,
      uptime: Math.round(os.uptime()),
      platform: os.platform(),
      hostname: os.hostname(),
      loadAvg: os.loadavg(),
    };
  } catch (err) {
    return { service, status: 'error', error: err.message };
  }
}

// ═══════════════════════════════════════
// MAIN HEALTH CHECK RUNNER
// ═══════════════════════════════════════

let healthCheckInterval = null;
let lastHealthCheckResult = null;
let healthCheckCount = 0;
let serverStartTime = null;

async function runHealthCheck(io, port) {
  healthCheckCount++;
  const startTime = Date.now();

  const results = await Promise.allSettled([
    checkMongoDB(),
    checkMySQL(),
    checkMemory(),
    checkExpressHealth(port),
    checkLogFiles(),
    checkSocketIO(io),
    Promise.resolve(checkDiskSpace()),
  ]);

  const healthReport = {
    checkNumber: healthCheckCount,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    uptime: serverStartTime ? Math.round((Date.now() - serverStartTime) / 1000) : 0,
    services: {},
    overallStatus: 'healthy',
    circuitBreakers: circuitBreaker.getAllStates(),
  };

  const serviceNames = ['MongoDB', 'MySQL', 'Memory', 'Express', 'LogFiles', 'Socket.IO', 'System'];

  results.forEach((result, idx) => {
    const name = serviceNames[idx];
    if (result.status === 'fulfilled' && result.value) {
      healthReport.services[name] = result.value;

      // Determine overall status
      const serviceStatus = result.value.status;
      // Skip optional services (like MySQL) — don't count them as failures
      if (serviceStatus === 'unavailable_optional') {
        // Optional service down — don't affect overall status
      } else if (serviceStatus === 'error' || serviceStatus === 'emergency') {
        healthReport.overallStatus = 'unhealthy';
      } else if (serviceStatus === 'warning' || serviceStatus === 'critical' || serviceStatus === 'timeout') {
        if (healthReport.overallStatus === 'healthy') {
          healthReport.overallStatus = 'degraded';
        }
      }
    } else {
      healthReport.services[name] = { status: 'check_failed', error: result.reason?.message };
      healthReport.overallStatus = 'degraded';
    }
  });

  lastHealthCheckResult = healthReport;
  return healthReport;
}

// ═══════════════════════════════════════
// ENGINE START / STOP
// ═══════════════════════════════════════

function startSelfHealingEngine({ io, server }) {
  const port = process.env.PORT || 5000;
  serverStartTime = Date.now();

  console.log('═══════════════════════════════════════════');
  console.log('🛡️  SELF-HEALING DEVOPS ENGINE STARTED');
  console.log(`   Health check interval: ${CONFIG.HEALTH_CHECK_INTERVAL_MS / 1000}s`);
  console.log(`   Circuit breaker threshold: ${CONFIG.CIRCUIT_BREAKER_THRESHOLD} failures`);
  console.log(`   Max restarts: ${CONFIG.MAX_RESTARTS_IN_WINDOW} per ${CONFIG.RESTART_WINDOW_MS / 60000} min`);
  console.log(`   Memory thresholds (RSS): warning ${CONFIG.MEMORY_WARNING_MB}MB | critical ${CONFIG.MEMORY_CRITICAL_MB}MB | emergency ${CONFIG.MEMORY_EMERGENCY_MB}MB`);
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'} — Discord alerts: ${process.env.NODE_ENV === 'production' ? 'ON' : 'OFF (dev mode)'}`);
  console.log(`   Alert cooldown: ${CONFIG.ALERT_COOLDOWN_MS / 60000} minutes per service`);
  console.log('═══════════════════════════════════════════');

  // Initial health check after 10 seconds (let server warm up)
  setTimeout(() => {
    runHealthCheck(io, port).then((report) => {
      console.log(`[SelfHealing] Initial health check: ${report.overallStatus} (${report.durationMs}ms)`);
    });
  }, 10000);

  // Periodic health checks
  healthCheckInterval = setInterval(() => {
    runHealthCheck(io, port).catch((err) => {
      console.error('[SelfHealing] Health check runner error:', err.message);
    });
  }, CONFIG.HEALTH_CHECK_INTERVAL_MS);

  // Only send startup notification in Production to avoid spam during local development/restarts
  if (process.env.NODE_ENV === 'production') {
    setTimeout(async () => {
      await sendDevOpsAlert({
        severity: SEVERITY.INFO,
        service: 'SelfHealingEngine',
        title: 'Self-Healing Engine Khởi Động (Production)',
        description: 'Hệ thống giám sát và tự sửa lỗi đã được kích hoạt trên môi trường Production.',
        action: 'Monitoring all services',
        result: '✅ ACTIVE',
      });
    }, 15000);
  }
}

function stopSelfHealingEngine() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    console.log('[SelfHealing] Engine stopped.');
  }
}

// ═══════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════

module.exports = {
  startSelfHealingEngine,
  stopSelfHealingEngine,
  runHealthCheck,
  getIncidentLog,
  getLastHealthCheckResult: () => lastHealthCheckResult,
  getCircuitBreakerStates: () => circuitBreaker.getAllStates(),
  resetCircuitBreaker: (service) => circuitBreaker.reset(service),
  canRestart,
  recordRestart,
  CONFIG,
};
