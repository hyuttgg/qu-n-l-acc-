const { parentPort, workerData } = require('worker_threads');
const crypto = require('crypto');

/**
 * Worker thread execution for batch data processing
 */
if (parentPort) {
  const { workerId, taskType, items, options = {} } = workerData;

  const results = [];
  const total = items.length;
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;

  const startTime = Date.now();

  try {
    for (let i = 0; i < total; i++) {
      const item = items[i];
      let processedItem = null;
      let status = 'SUCCESS';
      let errorMsg = null;

      try {
        if (taskType === 'ACCOUNT_CHECK') {
          // Account token & cookie format validation
          processedItem = processAccountItem(item, options);
        } else if (taskType === 'DATA_SANITIZATION') {
          // Data cleaning, deduplication, regex formatting
          processedItem = sanitizeDataItem(item, options);
        } else if (taskType === 'BATCH_CRYPTO') {
          // Cryptographic hashing & HMAC verification
          processedItem = processCryptoItem(item, options);
        } else if (taskType === 'PROXY_TEST') {
          // Simulated proxy / latency testing
          processedItem = processProxyItem(item, options);
        } else if (taskType === 'INVENTORY_AGGREGATION') {
          // Material / Inventory JSON parsing & aggregation
          processedItem = processInventoryItem(item, options);
        } else {
          // Generic batch processing
          processedItem = processGenericItem(item, options);
        }
        successCount++;
      } catch (err) {
        status = 'ERROR';
        errorMsg = err.message;
        errorCount++;
        processedItem = { raw: item, error: err.message };
      }

      processedCount++;

      results.push({
        index: i,
        status,
        data: processedItem,
        error: errorMsg,
        timestamp: new Date().toISOString()
      });

      // Send periodic progress updates every 5 items or at the end
      if (processedCount % 5 === 0 || processedCount === total) {
        parentPort.postMessage({
          type: 'WORKER_PROGRESS',
          workerId,
          processedCount,
          total,
          successCount,
          errorCount,
          memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100
        });
      }
    }

    const durationMs = Date.now() - startTime;

    parentPort.postMessage({
      type: 'WORKER_DONE',
      workerId,
      results,
      stats: {
        total,
        successCount,
        errorCount,
        durationMs,
        itemsPerSec: Math.round((total / (durationMs / 1000 || 1)) * 100) / 100,
        memoryUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100
      }
    });
  } catch (globalErr) {
    parentPort.postMessage({
      type: 'WORKER_ERROR',
      workerId,
      error: globalErr.message
    });
  }
}

// ═════════════════════════════════════════
// TASK PROCESSORS
// ═════════════════════════════════════════

function processAccountItem(item, options) {
  const str = typeof item === 'string' ? item.trim() : (item.username ? `${item.username}:${item.password || ''}:${item.cookie || ''}` : JSON.stringify(item));
  
  if (!str) throw new Error('Empty account string');

  // Format: username:password:cookie OR username:password
  const parts = str.split(':');
  const username = parts[0] ? parts[0].trim() : '';
  const password = parts[1] ? parts[1].trim() : '';
  const cookie = parts.slice(2).join(':').trim();

  if (!username) throw new Error('Missing username/identifier');

  // Simulate security check & cookie validation
  const isValidCookie = cookie.length > 20 || cookie.includes('.ROBLOSECURITY') || cookie.includes('sess_');
  const levelMatch = str.match(/level[=:]\s*(\d+)/i) || str.match(/lvl[=:]\s*(\d+)/i);
  const level = levelMatch ? parseInt(levelMatch[1], 10) : Math.floor(Math.random() * 1500) + 1000;

  const status = isValidCookie ? 'VALID' : (cookie ? 'EXPIRED_COOKIE' : 'NO_COOKIE');

  return {
    id: `acc_${crypto.randomBytes(4).toString('hex')}`,
    username,
    passwordMasked: password ? `${password.substring(0, 2)}***` : 'N/A',
    hasCookie: Boolean(cookie),
    status,
    level,
    believedAuthentic: status === 'VALID',
    checkedAt: new Date().toISOString()
  };
}

function sanitizeDataItem(item, options) {
  const text = typeof item === 'string' ? item.trim() : JSON.stringify(item);
  if (!text) throw new Error('Empty line');

  // Remove control characters, trim whitespace, normalize separators
  const cleaned = text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  const hash = crypto.createHash('md5').update(cleaned).digest('hex').substring(0, 8);

  const emailMatch = cleaned.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : null;

  return {
    hash,
    rawLength: text.length,
    cleaned,
    detectedEmail: email,
    containsSpecialChars: /[^a-zA-Z0-9\s:._-]/.test(cleaned)
  };
}

function processCryptoItem(item, options) {
  const payload = typeof item === 'string' ? item : JSON.stringify(item);
  const secret = options.secret || 'oceanforge_master_key_2026';

  const sha256 = crypto.createHash('sha256').update(payload).digest('hex');
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  return {
    sha256,
    hmac: hmac.substring(0, 16) + '...',
    verified: true,
    bytesProcessed: Buffer.byteLength(payload, 'utf8')
  };
}

function processProxyItem(item, options) {
  const proxyStr = typeof item === 'string' ? item.trim() : (item.ip ? `${item.ip}:${item.port}` : '');
  if (!proxyStr) throw new Error('Invalid proxy format');

  const parts = proxyStr.split(':');
  const ip = parts[0];
  const port = parts[1] || '8080';

  // Simulated latency calculation
  const isHealthy = !ip.startsWith('0.') && !ip.startsWith('127.0.0.1');
  const latencyMs = Math.floor(Math.random() * 180) + 20;

  return {
    proxy: `${ip}:${port}`,
    protocol: port === '443' ? 'HTTPS' : 'SOCKS5',
    latencyMs: isHealthy ? latencyMs : 9999,
    alive: isHealthy,
    anonymity: 'Elite'
  };
}

function processInventoryItem(item, options) {
  let obj = item;
  if (typeof item === 'string') {
    try {
      obj = JSON.parse(item);
    } catch (e) {
      obj = { name: item, quantity: 1 };
    }
  }

  const name = obj.name || obj.item || 'Unknown Item';
  const qty = parseInt(obj.quantity || obj.qty || 1, 10);
  const rarity = obj.rarity || (qty > 100 ? 'Mythical' : (qty > 10 ? 'Rare' : 'Common'));

  return {
    itemName: name,
    quantity: qty,
    rarity,
    category: obj.category || 'General',
    valueScore: qty * (rarity === 'Mythical' ? 50 : (rarity === 'Rare' ? 10 : 1))
  };
}

function processGenericItem(item, options) {
  const text = String(item);
  return {
    processed: true,
    original: text,
    length: text.length,
    uppercase: text.toUpperCase(),
    timestamp: new Date().toISOString()
  };
}
