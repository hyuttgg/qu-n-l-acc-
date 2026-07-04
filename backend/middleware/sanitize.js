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

function sanitizeItem(target) {
  if (target === null || target === undefined) return target;

  if (Array.isArray(target)) {
    return target.map(item => sanitizeItem(item));
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
        clean[key] = sanitizeItem(target[key]);
      }
    }
    return clean;
  }

  if (typeof target === 'string') {
    return escapeHTML(target);
  }

  return target;
}

/**
 * Express middleware — sanitizes body, query, and params
 */
const sanitizeInput = (req, res, next) => {
  if (req.body) req.body = sanitizeItem(req.body);
  if (req.query) req.query = sanitizeItem(req.query);
  if (req.params) req.params = sanitizeItem(req.params);
  next();
};

module.exports = { sanitizeInput, escapeHTML, sanitizeItem };
