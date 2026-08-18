/**
 * Recursively cleans keys and values in request objects
 * to prevent NoSQL Injection ($ and .) and XSS (<script>, HTML tags).
 */

/**
 * Escapes characters that could be used for HTML/Script injection
 * @param {string} str Target string
 * @returns {string} Escaped string
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

/**
 * Recursively removes MongoDB operator keys (starting with '$' or containing '.')
 * and escapes string values to prevent XSS.
 * @param {any} target Item to sanitize
 * @returns {any} Sanitized item
 */
function sanitizeItem(target) {
  if (target === null || target === undefined) {
    return target;
  }

  // Handle Arrays
  if (Array.isArray(target)) {
    return target.map(item => sanitizeItem(item));
  }

  // Handle Objects
  if (typeof target === 'object') {
    const cleanObject = {};
    for (const key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        // NoSQL Protection: Strip key if it starts with '$' or contains '.'
        // Exception: Allow legitimate sub-document properties if schema is validated (e.g. zod)
        // For general input, we strip it out
        if (key.startsWith('$') || key.includes('.')) {
          console.warn(`NoSQL Injection Attempt Blocked: Stripped key "${key}"`);
          continue;
        }

        cleanObject[key] = sanitizeItem(target[key]);
      }
    }
    return cleanObject;
  }

  // Handle Strings
  if (typeof target === 'string') {
    return escapeHTML(target);
  }

  // Pass numbers, booleans, dates, etc., unchanged
  return target;
}

/**
 * Express middleware to sanitize body, query, and params
 */
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeItem(req.body);
  }
  if (req.query) {
    req.query = sanitizeItem(req.query);
  }
  if (req.params) {
    req.params = sanitizeItem(req.params);
  }
  next();
};

module.exports = {
  sanitizeInput,
  escapeHTML,
  sanitizeItem
};
