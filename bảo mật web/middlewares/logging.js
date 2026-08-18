const path = require('path');
const winston = require('winston');

// Define format elements
const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom text format for files
const securityFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` | Metadata: ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Create Winston security auditor instance
const securityLogger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json() // Log as JSON for easy ingestion into Grafana Loki / ELK Stack
  ),
  transports: [
    // Write warning and error logs to security-audit.log
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/security-audit.log'), 
      level: 'warn' 
    }),
    // Write all security logs to combined log file
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/security-combined.log') 
    })
  ]
});

// Add console output in development environment
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
 * Express middleware helper to log API security events
 */
const auditLogMiddleware = (actionType) => (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const username = req.user ? req.user.username : (req.apiUser ? req.apiUser.username : 'anonymous');
  
  securityLogger.info(`Audit Log: User "${username}" triggered "${actionType}"`, {
    action: actionType,
    ip,
    path: req.originalUrl,
    method: req.method,
    username
  });
  
  next();
};

module.exports = {
  securityLogger,
  auditLogMiddleware
};
