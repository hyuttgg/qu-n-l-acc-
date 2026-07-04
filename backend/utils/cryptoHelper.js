const crypto = require('crypto');
const config = require('../config/security.config');

const ALGORITHM = config.dbEncryption.algorithm; // 'aes-256-gcm'
const IV_LENGTH = 12; // GCM recommended IV size

// Derive a proper 32-byte key from the configured value
let ENCRYPTION_KEY;
const rawKey = config.dbEncryption.key;
if (Buffer.byteLength(rawKey) === 32) {
  ENCRYPTION_KEY = Buffer.from(rawKey, 'utf-8');
} else {
  console.warn('[Security] DATABASE_ENCRYPTION_KEY is not 32 bytes — hashing to derive key. Fix this in production.');
  ENCRYPTION_KEY = crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Encrypt a plain text string using AES-256-GCM
 * @param {string} text Plain text to encrypt
 * @returns {string} Encrypted string in format "iv:ciphertext:authTag"
 */
function encrypt(text) {
  if (text === null || text === undefined) return text;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string
 * @param {string} cipherText Encrypted string in format "iv:ciphertext:authTag"
 * @returns {string} Decrypted plain text
 */
function decrypt(cipherText) {
  if (!cipherText || typeof cipherText !== 'string') return cipherText;

  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    // Not encrypted — return as-is (migration-safe for old unencrypted data)
    return cipherText;
  }

  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = { encrypt, decrypt };
