const crypto = require('crypto');
const config = require('../config/security.config');

const ALGORITHM = config.dbEncryption.algorithm;
// Retrieve key, ensuring it is 32 bytes (256 bits) for AES-256
let ENCRYPTION_KEY = config.dbEncryption.key;
if (Buffer.byteLength(ENCRYPTION_KEY) !== 32) {
  // Pad or truncate to ensure 32 bytes for dev safety, warning output
  console.warn('WARNING: DATABASE_ENCRYPTION_KEY is not 32 bytes. Adjusting size for compatibility. Please fix in production.');
  const hash = crypto.createHash('sha256');
  hash.update(ENCRYPTION_KEY);
  ENCRYPTION_KEY = hash.digest();
} else {
  ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY, 'utf-8');
}

const IV_LENGTH = 12; // GCM recommended IV size is 12 bytes

/**
 * Encrypt a string using AES-256-GCM
 * @param {string} text Plain text to encrypt
 * @returns {string} Encrypted string in format "iv:encryptedData:authTag"
 */
function encrypt(text) {
  if (text === null || text === undefined) return text;
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${encrypted}:${authTag}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt a string using AES-256-GCM
 * @param {string} cipherText Encrypted string in format "iv:encryptedData:authTag"
 * @returns {string} Decrypted plain text
 */
function decrypt(cipherText) {
  if (!cipherText || typeof cipherText !== 'string') return cipherText;
  
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    // If not matching pattern, return as is (useful for migrating unencrypted data or non-encrypted fields)
    return cipherText;
  }
  
  try {
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Decryption failed');
  }
}

module.exports = {
  encrypt,
  decrypt
};
