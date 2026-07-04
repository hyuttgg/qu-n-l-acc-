const helmet = require('helmet');
const config = require('../config/security.config');

/**
 * Configure Helmet with secure HTTP response headers
 * Customizes Content Security Policy (CSP) and HSTS.
 */
const helmetMiddleware = helmet({
  // Content Security Policy: control sources of scripts, styles, images etc.
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      // Allow fonts from google sources
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      // Allow scripts from self and secure CDNs if needed
      "script-src": ["'self'", "'unsafe-inline'"],
      // Allow styles from self and google fonts
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      // Allow images from self and local uploaded images / assets
      "img-src": ["'self'", "data:", "blob:", "http://localhost:5000", "https://yourdomain.com"],
      // Restrict frames (clickjacking prevention)
      "frame-ancestors": ["'none'"],
      // WebSocket connections (allow socket.io)
      "connect-src": ["'self'", "ws://localhost:5000", "wss://localhost:5000", "http://localhost:5000", "https://yourdomain.com"],
    },
  },
  
  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // allow loading local images/sockets from different origins
  
  // Prevent MIME-type Sniffing
  noSniff: true,
  
  // X-Frame-Options: Clickjacking prevention
  frameguard: {
    action: 'deny',
  },
  
  // Strict-Transport-Security: Force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  
  // Hide x-powered-by header to prevent server fingerprinting
  hidePoweredBy: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'same-origin',
  },
});

module.exports = helmetMiddleware;
