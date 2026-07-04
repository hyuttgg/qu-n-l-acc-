const path = require('path');
const winston = require('winston');

const { combine, timestamp, printf, colorize, json } = winston.format;

const securityFormat = printf(({ level, message, timestamp, ...meta }) => {
  let msg = `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
  if (Object.keys(meta).length > 0) msg += ` | ${JSON.stringify(meta)}`;
  return msg;
});

/**
 * Winston security logger
 * ─────────────────────────
 * Writes warn/error logs to security-audit.log
 * Writes all logs to security-combined.log
 * Console output in development mode
 */
const securityLogger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/security-audit.log'),
      level: 'warn'
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/security-combined.log')
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  securityLogger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      securityFormat
    )
  }));
}

/**
 * Audit log middleware — logs security-relevant actions
 * @param {string} actionType  e.g. 'login_attempt', 'api_key_regen', 'lua_update'
 */
const auditLogMiddleware = (actionType) => (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const username = req.user?.username || req.apiUser?.username || 'anonymous';

  securityLogger.info(`${actionType}`, {
    action: actionType,
    ip,
    path: req.originalUrl,
    method: req.method,
    username
  });

  next();
};

module.exports = { securityLogger, auditLogMiddleware };
