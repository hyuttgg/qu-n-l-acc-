const helmet = require('helmet');
const securityConfig = require('../config/security.config');

/**
 * Helmet — Secure HTTP Response Headers
 * ──────────────────────────────────────
 * Protects against: Clickjacking, XSS, MIME sniffing, server fingerprinting
 */
// Helper to clean origins from trailing whitespaces/newlines/carriage returns (\r)
const cleanOrigin = (url) => {
  if (!url) return '';
  return url.trim().replace(/[\r\n\t]/g, '');
};

const frontendUrl = cleanOrigin(process.env.FRONTEND_URL);
const allowedOrigins = securityConfig.cors.allowedOrigins
  ? securityConfig.cors.allowedOrigins.map(cleanOrigin).filter(Boolean)
  : [];

const allowedFrameAncestors = [
  "'self'",
  ...allowedOrigins,
  frontendUrl
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
      "connect-src": ["'self'", "ws:", "wss:", "http://localhost:5000", ...allowedOrigins, frontendUrl].filter(Boolean),
    },
  },
  crossOriginEmbedderPolicy: false,
  noSniff: true,
  frameguard: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  hidePoweredBy: true,
  referrerPolicy: { policy: 'same-origin' },
});
