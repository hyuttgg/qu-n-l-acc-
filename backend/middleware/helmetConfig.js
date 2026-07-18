const helmet = require('helmet');
const securityConfig = require('../config/security.config');

/**
 * Helmet — Secure HTTP Response Headers
 * ──────────────────────────────────────
 * Protects against: Clickjacking, XSS, MIME sniffing, server fingerprinting
 */
const allowedFrameAncestors = [
  "'self'",
  ...securityConfig.cors.allowedOrigins,
  process.env.FRONTEND_URL
].filter(Boolean);

module.exports = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "img-src": ["'self'", "data:", "blob:"],
      "frame-ancestors": allowedFrameAncestors,
      "connect-src": ["'self'", "ws:", "wss:", "http://localhost:5000", ...securityConfig.cors.allowedOrigins, process.env.FRONTEND_URL].filter(Boolean),
    },
  },
  crossOriginEmbedderPolicy: false,
  noSniff: true,
  frameguard: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  hidePoweredBy: true,
  referrerPolicy: { policy: 'same-origin' },
});
