const mysql = require('mysql2/promise');
const EventEmitter = require('events');

// ═══════════════════════════════════════
// MYSQL CONNECTION EVENT BUS
// ═══════════════════════════════════════
const mysqlEvents = new EventEmitter();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'bloxfruits_db',
  port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// ── Pool Error Monitoring (for Self-Healing Engine) ──
pool.on('connection', (connection) => {
  console.log('[MySQL Pool] New connection established');
});

pool.on('release', (connection) => {
  // Connection returned to pool — normal operation
});

// Monitor for pool-level acquire errors (enqueue is emitted when waiting for a connection)
pool.on('enqueue', () => {
  console.warn('[MySQL Pool] Waiting for available connection slot — pool may be exhausted');
  mysqlEvents.emit('pool_pressure', { timestamp: new Date() });
});

async function checkMySQLConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database Connected successfully.');
    connection.release();
    mysqlEvents.emit('connected', { timestamp: new Date() });
    return true;
  } catch (error) {
    console.warn(`⚠️ MySQL Connection Warning: ${error.message}. (Server will proceed with fallback/Mongo)`);
    mysqlEvents.emit('connection_failed', { error: error.message, timestamp: new Date() });
    return false;
  }
}

/**
 * Attempt to recover MySQL pool by testing a fresh connection
 * Called by self-healing engine when MySQL health check fails
 */
async function attemptPoolRecovery() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('[MySQL Pool] Recovery check passed — pool is functional');
    mysqlEvents.emit('recovered', { timestamp: new Date() });
    return true;
  } catch (err) {
    console.error('[MySQL Pool] Recovery failed:', err.message);
    mysqlEvents.emit('recovery_failed', { error: err.message, timestamp: new Date() });
    return false;
  }
}

module.exports = {
  pool,
  checkMySQLConnection,
  attemptPoolRecovery,
  mysqlEvents,
};
