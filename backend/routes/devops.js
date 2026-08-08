/**
 * OceanForge DevOps Dashboard API Routes
 * ──────────────────────────────────────
 * Admin-only API endpoints for monitoring system health,
 * viewing incidents, and managing the self-healing engine.
 * 
 * All routes require admin JWT authentication.
 * 
 * Endpoints:
 *   GET  /api/devops/health         — Tổng quan trạng thái services
 *   GET  /api/devops/incidents      — Lịch sử sự cố (last 50)
 *   GET  /api/devops/metrics        — CPU, memory, uptime, response time
 *   GET  /api/devops/dashboard      — Full dashboard data
 *   POST /api/devops/force-check    — Trigger health check thủ công
 *   POST /api/devops/reset-circuit  — Reset circuit breaker cho 1 service
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const os = require('os');

const {
  runHealthCheck,
  getIncidentLog,
  getLastHealthCheckResult,
  getCircuitBreakerStates,
  resetCircuitBreaker,
  triggerAutoFixForService,
} = require('../utils/selfHealingEngine');

const { getDashboardData, getFullHealthReport } = require('../utils/healthCheckDaemon');
const { getNotificationHistory } = require('../utils/devopsNotifier');
const securityConfig = require('../config/security.config');

// ═══════════════════════════════════════
// ADMIN AUTH MIDDLEWARE
// ═══════════════════════════════════════

function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'DevOps API requires admin authentication',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, securityConfig.jwt.secret);

    // Check if user has admin role
    if (!decoded.role || decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'DevOps API requires admin privileges',
      });
    }

    req.adminUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired admin token',
    });
  }
}

// ═══════════════════════════════════════
// GET /api/devops/health
// Quick health overview of all services
// ═══════════════════════════════════════

router.get('/health', requireAdmin, (req, res) => {
  const lastCheck = getLastHealthCheckResult();

  if (!lastCheck) {
    return res.status(200).json({
      success: true,
      message: 'Health check engine warming up — no data yet',
      data: { overallStatus: 'initializing' },
    });
  }

  // Color-coded status summary
  const serviceSummary = {};
  for (const [name, data] of Object.entries(lastCheck.services)) {
    serviceSummary[name] = {
      status: data.status,
      ...(data.responseTimeMs !== undefined && { responseTimeMs: data.responseTimeMs }),
      ...(data.connections !== undefined && { connections: data.connections }),
      ...(data.heapPercent !== undefined && { heapPercent: data.heapPercent }),
      ...(data.error && { error: data.error }),
    };
  }

  res.status(200).json({
    success: true,
    data: {
      overallStatus: lastCheck.overallStatus,
      lastCheckAt: lastCheck.timestamp,
      durationMs: lastCheck.durationMs,
      uptime: lastCheck.uptime,
      services: serviceSummary,
      circuitBreakers: lastCheck.circuitBreakers,
    },
  });
});

// ═══════════════════════════════════════
// GET /api/devops/incidents
// Historical incident log
// ═══════════════════════════════════════

router.get('/incidents', requireAdmin, (req, res) => {
  const incidents = getIncidentLog();
  const limit = parseInt(req.query.limit) || 50;

  res.status(200).json({
    success: true,
    data: {
      total: incidents.length,
      incidents: incidents.slice(-limit).reverse(), // Most recent first
    },
  });
});

// ═══════════════════════════════════════
// GET /api/devops/metrics
// System metrics: CPU, memory, uptime, etc.
// ═══════════════════════════════════════

router.get('/metrics', requireAdmin, (req, res) => {
  const memUsage = process.memoryUsage();
  const cpus = os.cpus();

  // Calculate CPU usage
  const cpuUsage = cpus.map((cpu, idx) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return {
      core: idx,
      usagePercent: Math.round(((total - idle) / total) * 100),
      model: cpu.model,
      speed: cpu.speed,
    };
  });

  const avgCpuUsage = Math.round(
    cpuUsage.reduce((sum, c) => sum + c.usagePercent, 0) / cpuUsage.length
  );

  res.status(200).json({
    success: true,
    data: {
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        uptimeSeconds: Math.round(process.uptime()),
      },
      memory: {
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapPercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
        externalMB: Math.round(memUsage.external / 1024 / 1024),
      },
      system: {
        totalMemoryGB: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100,
        freeMemoryGB: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100,
        usedMemoryPercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
        cpuCores: cpus.length,
        avgCpuUsage,
        loadAverage: os.loadavg(),
        hostname: os.hostname(),
        uptimeSeconds: Math.round(os.uptime()),
      },
      cpu: cpuUsage,
    },
  });
});

// ═══════════════════════════════════════
// GET /api/devops/dashboard
// Full dashboard data (combined view)
// ═══════════════════════════════════════

router.get('/dashboard', requireAdmin, (req, res) => {
  const dashboardData = getDashboardData();
  const notifications = getNotificationHistory();

  res.status(200).json({
    success: true,
    data: {
      ...dashboardData,
      recentNotifications: notifications.slice(-20).reverse(),
    },
  });
});

// ═══════════════════════════════════════
// GET /api/devops/report
// Full detailed report (for export/debug)
// ═══════════════════════════════════════

router.get('/report', requireAdmin, (req, res) => {
  const report = getFullHealthReport();
  const notifications = getNotificationHistory();

  res.status(200).json({
    success: true,
    data: {
      ...report,
      notifications,
      generatedAt: new Date().toISOString(),
    },
  });
});

// ═══════════════════════════════════════
// POST /api/devops/force-check
// Trigger an immediate health check
// ═══════════════════════════════════════

router.post('/force-check', requireAdmin, async (req, res) => {
  try {
    const io = req.app.get('io');
    const port = process.env.PORT || 5000;

    const report = await runHealthCheck(io, port);

    res.status(200).json({
      success: true,
      message: 'Health check executed successfully',
      data: report,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: err.message,
    });
  }
});

// ═══════════════════════════════════════
// POST /api/devops/reset-circuit
// Reset circuit breaker for a specific service
// ═══════════════════════════════════════

router.post('/reset-circuit', requireAdmin, (req, res) => {
  const { service } = req.body;

  if (!service) {
    return res.status(400).json({
      success: false,
      message: 'Service name is required. Available: MongoDB, MySQL, Memory, CPU, Express, Socket.IO',
    });
  }

  resetCircuitBreaker(service);

  res.status(200).json({
    success: true,
    message: `Circuit breaker for "${service}" has been reset`,
    data: getCircuitBreakerStates(),
  });
});

// ═══════════════════════════════════════
// POST /api/devops/trigger-autofix
// Trigger auto-fix action manually for a target service
// ═══════════════════════════════════════

router.post('/trigger-autofix', requireAdmin, async (req, res) => {
  const { service } = req.body;

  if (!service) {
    return res.status(400).json({
      success: false,
      message: 'Service parameter is required (e.g. MongoDB, Memory, Express, LogFiles)',
    });
  }

  try {
    const autofixResult = await triggerAutoFixForService(service);

    res.status(200).json({
      success: true,
      message: `Auto-fix triggered for ${service}`,
      data: autofixResult,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Failed to trigger auto-fix for ${service}`,
      error: err.message,
    });
  }
});

module.exports = router;
