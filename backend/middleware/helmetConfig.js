const helmet = require('helmet');

/**
 * Helmet — Secure HTTP Response Headers
 * ──────────────────────────────────────
 * Protects against: Clickjacking, XSS, MIME sniffing, server fingerprinting
 */
module.exports = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "img-src": ["'self'", "data:", "blob:"],
      "frame-ancestors": ["'none'"],
      "connect-src": ["'self'", "ws:", "wss:", "http://localhost:5000"],
    },
  },
  crossOriginEmbedderPolicy: false,
  noSniff: true,
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  hidePoweredBy: true,
  referrerPolicy: { policy: 'same-origin' },
});
