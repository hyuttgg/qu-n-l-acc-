const config = require('../config/security.config');

/**
 * Universal Bulletproof CORS Middleware
 * ──────────────────────────────────────
 * Dynamically allows whitelisted origins and reflects requested headers
 * so preflight OPTIONS requests NEVER fail on any browser version or cached client.
 */
module.exports = (req, res, next) => {
  const origin = req.headers.origin;

  if (origin) {
    const cleanOriginStr = origin.trim().replace(/[\r\n\t]/g, '');
    const isAllowed =
      config.cors.allowedOrigins.some((allowed) => cleanOriginStr.startsWith(allowed)) ||
      cleanOriginStr.endsWith('.vercel.app') ||
      cleanOriginStr.includes('manageblox.io.vn') ||
      cleanOriginStr.includes('localhost') ||
      cleanOriginStr.includes('127.0.0.1');

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');

      const requestedHeaders = req.headers['access-control-request-headers'];
      if (requestedHeaders) {
        res.setHeader('Access-Control-Allow-Headers', requestedHeaders);
      } else {
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization, x-api-key, x-signature, x-timestamp, x-nonce, x-device-id, x-csrf-token, x-admin-passcode, X-Admin-Passcode, x-requested-with'
        );
      }
    } else {
      console.warn(`[CORS] Blocked origin: "${origin}"`);
    }
  } else {
    // Non-browser client (Lua HttpService, curl, Postman)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', '*');
  }

  // Handle Preflight OPTIONS requests immediately with 200 OK
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
};
