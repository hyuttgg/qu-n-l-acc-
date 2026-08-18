const crypto = require('crypto');
const config = require('../config/security.config');

/**
 * Double Submit Cookie CSRF Protection Middleware
 * 
 * Flow:
 * 1. GET requests generate a CSRF token and set it in a secure HttpOnly cookie + return it in headers.
 * 2. POST, PUT, DELETE requests must supply the CSRF token in the 'x-csrf-token' header.
 * 3. The server validates that the header token matches the cookie token.
 */

// Generate a cryptographically secure random token
const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Middleware to generate and set a new CSRF token in a cookie and header
 * Call this on bootstrap endpoints like `/api/auth/me` or on load
 */
const setCsrfToken = (req, res, next) => {
  // Only generate a new one if it doesn't exist to prevent session noise
  let token = req.cookies ? req.cookies['csrf-token'] : null;
  
  if (!token) {
    token = generateCsrfToken();
  }

  // Set cookie (HttpOnly=true, SameSite=Strict)
  res.cookie('csrf-token', token, {
    httpOnly: config.cookies.httpOnly, // true (server-only)
    sameSite: config.cookies.sameSite, // 'strict'
    secure: config.cookies.secure,     // true in production
    path: '/'
  });

  // Expose token via response header so frontend can read and store it in state/memory
  res.setHeader('x-csrf-token-exposed', token);
  
  // Also attach to request object
  req.csrfToken = token;
  next();
};

/**
 * Middleware to verify the CSRF token on modifying HTTP methods
 */
const verifyCsrfToken = (req, res, next) => {
  // Safe methods do not require CSRF verification
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF for Roblox Lua endpoints since they use cryptographic signatures (x-signature)
  if (req.path.startsWith('/api/lua') || req.path.startsWith('/api/client')) {
    return next();
  }

  // Extract token from request headers
  const headerToken = req.headers['x-csrf-token'];
  
  // Extract token from cookies (requires cookie-parser middleware)
  const cookieToken = req.cookies ? req.cookies['csrf-token'] : null;

  if (!cookieToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing from cookie. Action rejected.'
    });
  }

  if (!headerToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing from headers. Action rejected.'
    });
  }

  // Timing safe token comparison
  const bufferHeader = Buffer.from(headerToken, 'utf-8');
  const bufferCookie = Buffer.from(cookieToken, 'utf-8');

  if (bufferHeader.length !== bufferCookie.length || !crypto.timingSafeEqual(bufferHeader, bufferCookie)) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token validation failed. Unauthorized cross-site request.'
    });
  }

  next();
};

module.exports = {
  setCsrfToken,
  verifyCsrfToken
};
