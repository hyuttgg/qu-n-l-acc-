const crypto = require('crypto');
const User = require('../models/User');

const PREFIXES = [
  'Shadow', 'Dark', 'Cyber', 'Ghost', 'Nova',
  'Fire', 'Crystal', 'Night', 'Thunder', 'Silver'
];

const SUFFIXES = [
  'Fox', 'Wolf', 'Dragon', 'Tiger', 'Falcon',
  'Phoenix', 'Lion', 'Blade', 'Storm', 'Hunter'
];

/**
 * Generate a unique User Code in the format USR-XXXX-XXXX
 * @returns {Promise<string>}
 */
async function generateUserCode() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let isUnique = false;
  let code = '';
  let attempts = 0;

  while (!isUnique && attempts < 20) {
    attempts++;
    let part1 = '';
    let part2 = '';

    for (let i = 0; i < 4; i++) {
      part1 += chars.charAt(Math.floor(Math.random() * chars.length));
      part2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    code = `USR-${part1}-${part2}`;

    if (global.dbConnected) {
      const existing = await User.findOne({ userCode: code });
      if (!existing) {
        isUnique = true;
      }
    } else {
      isUnique = true;
    }
  }

  return code;
}

/**
 * Generate a unique internal Nickname (e.g., ShadowFox, CyberWolf).
 * Appends digits if collision occurs (e.g., ShadowFox742).
 * @returns {Promise<string>}
 */
async function generateNickname() {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  const baseNickname = `${prefix}${suffix}`;

  if (!global.dbConnected) {
    return baseNickname;
  }

  // Check if base nickname exists
  const existingBase = await User.findOne({ nickname: baseNickname });
  if (!existingBase) {
    return baseNickname;
  }

  // Collision resolution: try baseNickname + 3-digit random number
  let isUnique = false;
  let candidate = '';
  let attempts = 0;

  while (!isUnique && attempts < 20) {
    attempts++;
    const randomDigits = Math.floor(100 + Math.random() * 900); // 100-999
    candidate = `${baseNickname}${randomDigits}`;
    const existing = await User.findOne({ nickname: candidate });
    if (!existing) {
      isUnique = true;
    }
  }

  return candidate;
}

module.exports = {
  generateUserCode,
  generateNickname,
  PREFIXES,
  SUFFIXES
};
