/**
 * OceanForge PM2 Ecosystem Configuration
 * ──────────────────────────────────────
 * Production-grade process management with:
 * - Auto-restart on crash (with exponential backoff)
 * - Memory limit restart (500MB threshold)
 * - Log rotation & management
 * - Environment-specific configs
 * 
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 start ecosystem.config.js --env development
 */

const path = require('path');

module.exports = {
  apps: [
    {
      // ═══════════════════════════════════
      // MAIN SERVER
      // ═══════════════════════════════════
      name: 'oceanforge-backend',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,

      // ── Auto-Restart Configuration ──
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',     // Restart if memory exceeds 500MB
      max_restarts: 10,               // Max 10 restarts before stopping
      min_uptime: '10s',              // Consider stable after 10s uptime
      restart_delay: 5000,            // 5 second delay between restarts
      exp_backoff_restart_delay: 100, // Exponential backoff starting at 100ms

      // ── Logging ──
      error_file: path.join(__dirname, 'logs', 'pm2-error.log'),
      out_file: path.join(__dirname, 'logs', 'pm2-out.log'),
      log_file: path.join(__dirname, 'logs', 'pm2-combined.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // ── Kill Timeout ──
      kill_timeout: 10000,         // 10s graceful shutdown before SIGKILL
      listen_timeout: 15000,       // 15s to wait for app to be online
      shutdown_with_message: true, // Send shutdown message before kill

      // ── Environment: Production ──
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },

      // ── Environment: Development ──
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000,
      },

      // ── Health Check (PM2+ feature) ──
      // Uncomment if using PM2 Plus
      // health_check_grace_period: 10000,
    },
  ],
};
