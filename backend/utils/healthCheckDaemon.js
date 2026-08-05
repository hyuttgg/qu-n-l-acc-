/**
 * OceanForge Health Check Daemon
 * ──────────────────────────────────────
 * Background daemon that collects health metrics over time and provides
 * aggregated dashboard data: uptime %, avg response time, incident history.
 * 
 * Works alongside selfHealingEngine.js — this module focuses on metrics
 * aggregation and historical tracking.
 */

const {
  getLastHealthCheckResult,
  getIncidentLog,
  getCircuitBreakerStates,
} = require('./selfHealingEngine');

// ═══════════════════════════════════════
// METRICS RING BUFFER
// ═══════════════════════════════════════

const MAX_METRICS_HISTORY = 100;
const metricsHistory = [];
let totalChecks = 0;
let healthyChecks = 0;
let daemonStartTime = null;

function recordMetrics(healthReport) {
  if (!healthReport) return;

  totalChecks++;
  if (healthReport.overallStatus === 'healthy') {
    healthyChecks++;
  }

  metricsHistory.push({
    timestamp: healthReport.timestamp,
    overallStatus: healthReport.overallStatus,
    durationMs: healthReport.durationMs,
    services: Object.fromEntries(
      Object.entries(healthReport.services).map(([name, data]) => [name, data.status])
    ),
  });

  if (metricsHistory.length > MAX_METRICS_HISTORY) {
    metricsHistory.shift();
  }
}

// ═══════════════════════════════════════
// DASHBOARD DATA PROVIDER
// ═══════════════════════════════════════

/**
 * Get comprehensive dashboard data for the DevOps API
 */
function getDashboardData() {
  const lastCheck = getLastHealthCheckResult();
  const incidents = getIncidentLog();
  const circuitBreakers = getCircuitBreakerStates();
  const now = Date.now();

  // Calculate uptime percentage
  const uptimePercent = totalChecks > 0
    ? Math.round((healthyChecks / totalChecks) * 10000) / 100
    : 100;

  // Calculate average response time from last 20 checks
  const recentChecks = metricsHistory.slice(-20);
  const avgResponseTime = recentChecks.length > 0
    ? Math.round(recentChecks.reduce((sum, m) => sum + (m.durationMs || 0), 0) / recentChecks.length)
    : 0;

  // Find last incident
  const lastIncident = incidents.length > 0 ? incidents[incidents.length - 1] : null;

  // Engine uptime
  const engineUptime = daemonStartTime ? Math.round((now - daemonStartTime) / 1000) : 0;

  return {
    overview: {
      overallStatus: lastCheck ? lastCheck.overallStatus : 'unknown',
      uptimePercent,
      avgResponseTimeMs: avgResponseTime,
      totalHealthChecks: totalChecks,
      engineUptimeSeconds: engineUptime,
      lastCheckAt: lastCheck ? lastCheck.timestamp : null,
    },
    services: lastCheck ? lastCheck.services : {},
    circuitBreakers,
    recentIncidents: incidents.slice(-10),
    metrics: {
      history: metricsHistory.slice(-20),
      totalChecks,
      healthyChecks,
      degradedChecks: totalChecks - healthyChecks,
    },
  };
}

/**
 * Get full health report with all details
 */
function getFullHealthReport() {
  return {
    lastHealthCheck: getLastHealthCheckResult(),
    incidents: getIncidentLog(),
    circuitBreakers: getCircuitBreakerStates(),
    metricsHistory: [...metricsHistory],
    stats: {
      totalChecks,
      healthyChecks,
      uptimePercent: totalChecks > 0 ? Math.round((healthyChecks / totalChecks) * 10000) / 100 : 100,
      daemonUptime: daemonStartTime ? Math.round((Date.now() - daemonStartTime) / 1000) : 0,
    },
  };
}

// ═══════════════════════════════════════
// DAEMON LIFECYCLE
// ═══════════════════════════════════════

let metricsCollectorInterval = null;

function startHealthCheckDaemon() {
  daemonStartTime = Date.now();

  console.log('📊 Health Check Daemon started — collecting metrics...');

  // Collect metrics every 35 seconds (offset from 30s health check to avoid race)
  metricsCollectorInterval = setInterval(() => {
    const lastCheck = getLastHealthCheckResult();
    if (lastCheck) {
      recordMetrics(lastCheck);
    }
  }, 35000);
}

function stopHealthCheckDaemon() {
  if (metricsCollectorInterval) {
    clearInterval(metricsCollectorInterval);
    metricsCollectorInterval = null;
    console.log('📊 Health Check Daemon stopped.');
  }
}

// ═══════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════

module.exports = {
  startHealthCheckDaemon,
  stopHealthCheckDaemon,
  getDashboardData,
  getFullHealthReport,
};
