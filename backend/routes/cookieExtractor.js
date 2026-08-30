const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const Inventory = require('../models/Inventory');
const mockStore = require('../utils/mockStore');
const { protect } = require('../middleware/auth');

// Helper: Sanitize & Validate Cookie
function validateRobloxCookie(raw) {
  if (!raw) return { isValid: false, message: 'Trống' };
  let clean = raw.trim();
  clean = clean.replace(/^["'`]|["'`]$/g, '');
  clean = clean.replace(/^\.ROBLOSECURITY\s*=\s*/i, '');
  clean = clean.replace(/^ROBLOSECURITY\s*=\s*/i, '');
  clean = clean.replace(/[;,]+$/, '').trim();

  const hasWarning = clean.includes('_|WARNING:-DO-NOT-SHARE-THIS') || clean.includes('_|WARNING:');

  if (clean.length < 50) {
    return { isValid: false, cleanCookie: clean, message: 'Độ dài quá ngắn' };
  }

  if (hasWarning && clean.length >= 300) {
    return { isValid: true, cleanCookie: clean, message: 'Hợp lệ' };
  }

  if (!hasWarning && clean.length >= 600) {
    return { isValid: true, cleanCookie: clean, message: 'Hợp lệ (thiếu header)' };
  }

  return { isValid: false, cleanCookie: clean, message: 'Định dạng không khớp .ROBLOSECURITY' };
}

/**
 * @route   POST /api/tools/cookie-splitter/extract
 * @desc    Extract and parse Roblox cookies from raw text
 * @access  Public / Optional Auth
 */
router.post('/extract', async (req, res) => {
  try {
    const { rawText, delimiter = 'auto', removeDuplicates = true } = req.body;

    if (!rawText || typeof rawText !== 'string') {
      return res.status(400).json({ success: false, message: 'Dữ liệu đầu vào rawText là bắt buộc' });
    }

    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const seenCookies = new Set();
    const items = [];

    let validCount = 0;
    let duplicateCount = 0;

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      let username = '';
      let password = '';
      let foundCookie = '';

      // Check JSON format
      if (line.startsWith('{') && line.endsWith('}')) {
        try {
          const json = JSON.parse(line);
          foundCookie = json.cookie || json.robloxSecurity || json['.ROBLOSECURITY'] || '';
          username = json.username || json.user || '';
          password = json.password || json.pass || '';
        } catch {
          // ignore
        }
      }

      // Check boundary regex and combo prefix
      if (!foundCookie) {
        const cookieMatch = line.match(/(?:\.ROBLOSECURITY\s*=\s*)?(_\|WARNING:-DO-NOT-SHARE-THIS[.\w\-~]+|_\|WARNING:[^\s,;:"'<>]+|[a-zA-Z0-9_\-~]{650,})/i);
        if (cookieMatch && typeof cookieMatch.index === 'number') {
          foundCookie = cookieMatch[1];

          const prefix = line.substring(0, cookieMatch.index).trim().replace(/[:|;,\t]+$/, '');
          if (prefix && !prefix.startsWith('Cookie:') && !prefix.startsWith('#')) {
            let sep = ':';
            if (delimiter && delimiter !== 'auto') sep = delimiter;
            else if (prefix.includes('|')) sep = '|';
            else if (prefix.includes('\t')) sep = '\t';
            else if (prefix.includes(';')) sep = ';';
            else if (prefix.includes(',') && !prefix.includes('{"')) sep = ',';

            const prefixParts = prefix.split(sep);
            if (prefixParts.length >= 2) {
              username = prefixParts[0].trim();
              password = prefixParts.slice(1).join(sep).trim();
            } else if (prefixParts.length === 1) {
              username = prefixParts[0].trim();
            }
          }
        }
      }

      if (foundCookie) {
        const val = validateRobloxCookie(foundCookie);
        const isDup = seenCookies.has(val.cleanCookie);

        if (isDup) {
          duplicateCount++;
        } else {
          seenCookies.add(val.cleanCookie);
        }

        if (val.isValid) validCount++;

        if (removeDuplicates && isDup) continue;

        items.push({
          id: `item_${index}_${Math.random().toString(36).substr(2, 6)}`,
          originalLine: line,
          username: username || (val.isValid ? `FleetAcc_${index + 1}` : ''),
          password,
          cookie: val.cleanCookie,
          withPrefixCookie: `.ROBLOSECURITY=${val.cleanCookie}`,
          isValid: val.isValid,
          length: val.cleanCookie.length,
          isDuplicate: isDup,
          statusMessage: val.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      stats: {
        totalLines: lines.length,
        totalFound: items.length,
        validCount,
        duplicateCount,
        uniqueCount: seenCookies.size,
      },
      data: items,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/tools/cookie-splitter/import-fleet
 * @desc    Batch import extracted accounts with cookies into user's fleet
 * @access  Private
 */
router.post('/import-fleet', protect, async (req, res) => {
  try {
    const { accounts } = req.body;
    const userId = req.user._id || req.user.id;

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách accounts không hợp lệ' });
    }

    const imported = [];
    const skipped = [];

    for (const acc of accounts) {
      const username = (acc.username || '').trim();
      const cookie = (acc.cookie || '').trim();

      if (!username || !cookie) {
        skipped.push({ username: username || 'Unknown', reason: 'Thiếu Username hoặc Cookie' });
        continue;
      }

      // Check DB vs MockStore
      if (!global.dbConnected) {
        let existing = mockStore.findAccountByRobloxName(userId, username);
        if (!existing) {
          existing = mockStore.createAccount(userId, username);
          mockStore.createInventory(existing.id);
        }
        existing.notes = `Cookie: ${cookie.substring(0, 30)}... | Imported ${new Date().toLocaleDateString()}`;
        existing.status = 'idle';
        existing.lastSeen = new Date();
        imported.push(existing);
      } else {
        let existing = await Account.findOne({ userId, robloxUsername: username });
        if (!existing) {
          existing = await Account.create({
            userId,
            robloxUsername: username,
            level: 1,
            beli: 0,
            fragments: 0,
            sea: 1,
            status: 'idle',
            notes: `Cookie: ${cookie.substring(0, 30)}... | Imported ${new Date().toLocaleDateString()}`,
            lastSeen: new Date(),
          });
          await Inventory.create({ accountId: existing._id });
        } else {
          existing.notes = `Cookie: ${cookie.substring(0, 30)}... | Updated ${new Date().toLocaleDateString()}`;
          existing.lastSeen = new Date();
          await existing.save();
        }
        imported.push(existing);
      }
    }

    res.status(200).json({
      success: true,
      message: `Đã nạp thành công ${imported.length} tài khoản vào Fleet!`,
      importedCount: imported.length,
      skippedCount: skipped.length,
      data: imported,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
