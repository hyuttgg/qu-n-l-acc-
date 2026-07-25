/**
 * Input Sanitization Middleware
 * ─────────────────────────────
 * Recursively cleans request data to prevent:
 *  - NoSQL Injection (strips keys starting with '$' or containing '.')
 *  - XSS (escapes dangerous HTML characters in string values)
 *
 * Zero external dependencies — uses pure string manipulation.
 */

function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

const SENSITIVE_KEYS = new Set(['password', 'confirmpassword', 'token', 'code', 'authorization', 'secret', 'oldpassword', 'newpassword']);

function sanitizeItem(target, parentKey = '') {
  if (target === null || target === undefined) return target;

  if (Array.isArray(target)) {
    return target.map(item => sanitizeItem(item, parentKey));
  }

  if (typeof target === 'object') {
    const clean = {};
    for (const key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        // Block MongoDB operator injection via key names
        if (key.startsWith('$') || key.includes('.')) {
          console.warn(`[Sanitize] Blocked suspicious key: "${key}"`);
          continue;
        }
        clean[key] = sanitizeItem(target[key], key);
      }
    }
    return clean;
  }

  if (typeof target === 'string') {
    // Preserve authentication credentials (passwords, tokens, OAuth codes) without HTML escaping
    if (SENSITIVE_KEYS.has(parentKey.toLowerCase())) {
      return target;
    }
    return escapeHTML(target);
  }

  return target;
}

/**
 * Express middleware — sanitizes body, query, and params
 */
const sanitizeInput = (req, res, next) => {
  // Bypass query parameter sanitization for Google OAuth callback to prevent corrupting 'code' containing '/'
  if (req.path && req.path.includes('/google/callback')) {
    if (req.body) req.body = sanitizeItem(req.body);
    if (req.params) req.params = sanitizeItem(req.params);
    return next();
  }

  if (req.body) req.body = sanitizeItem(req.body);
  if (req.query) req.query = sanitizeItem(req.query);
  if (req.params) req.params = sanitizeItem(req.params);
  next();
};

module.exports = { sanitizeInput, escapeHTML, sanitizeItem };
