const crypto = require('crypto');
const config = require('../config/security.config');

/**
 * CSRF Protection — Double Submit Cookie Pattern
 * ─────────────────────────────────────────────────
 * Safe methods (GET, HEAD, OPTIONS) bypass CSRF.
 * Lua API routes (/api/lua, /api/client) bypass CSRF (they use signatures).
 * Mutating dashboard requests must supply x-csrf-token header matching cookie.
 */

const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

/** Set a CSRF token in cookie + response header */
const setCsrfToken = (req, res, next) => {
  let token = req.cookies ? req.cookies['csrf-token'] : null;
  if (!token) token = generateCsrfToken();

  res.cookie('csrf-token', token, {
    httpOnly: config.cookies.httpOnly,
    sameSite: config.cookies.sameSite,
    secure: config.cookies.secure,
    path: '/'
  });

  res.setHeader('x-csrf-token', token);
  req.csrfToken = token;
  next();
};

/** Verify CSRF token on mutating requests */
const verifyCsrfToken = (req, res, next) => {
  // Safe methods skip
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  // Lua endpoints skip (protected by HMAC signature instead)
  if (req.path.startsWith('/api/lua') || req.path.startsWith('/api/client')) return next();

  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies ? req.cookies['csrf-token'] : null;

  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing. Action rejected.'
    });
  }

  // Timing-safe comparison
  try {
    const bufHeader = Buffer.from(headerToken, 'utf-8');
    const bufCookie = Buffer.from(cookieToken, 'utf-8');
    if (bufHeader.length !== bufCookie.length || !crypto.timingSafeEqual(bufHeader, bufCookie)) {
      return res.status(403).json({
        success: false,
        message: 'CSRF token mismatch. Cross-site request blocked.'
      });
    }
  } catch {
    return res.status(403).json({
      success: false,
      message: 'CSRF validation error.'
    });
  }

  next();
};

module.exports = { setCsrfToken, verifyCsrfToken };
