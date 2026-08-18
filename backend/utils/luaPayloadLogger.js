// Telemetry Logger for Admin to inspect 100% accurate raw Lua payloads sent from Roblox executors

const logs = [];

/**
 * Log an incoming raw Lua payload
 */
const addPayloadLog = (data) => {
  const logEntry = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    userEmail: data.userEmail || 'unknown@user.com',
    username: data.username || 'User',
    robloxUsername: data.robloxUsername || data.username || 'RobloxPlayer',
    ip: data.ip || '127.0.0.1',
    executorHeader: data.executorHeader || 'Roblox HttpService',
    payloadSizeBytes: data.payloadSize || 0,
    rawPayload: data.rawPayload || {}, // Complete un-truncated JSON
    parsedSummary: {
      level: data.level || 1,
      beli: data.beli || 0,
      fragments: data.fragments || 0,
      sea: data.sea || 1,
      race: data.race || 'Human',
      status: data.status || 'offline',
      location: data.location || 'Unknown',
      equipped: data.equipped || {},
      fruitsCount: (data.inventory?.fruits || []).length,
      materialsCount: (data.inventory?.materials || []).length,
      swordsCount: (data.inventory?.swords || []).length,
      gunsCount: (data.inventory?.guns || []).length,
      stylesCount: (data.inventory?.styles || []).length,
      accessoriesCount: (data.inventory?.accessories || []).length,
    }
  };

  logs.unshift(logEntry);
  if (logs.length > 100) {
    logs.pop();
  }

  // Emit realtime socket update to connected web clients
  if (global.io) {
    global.io.emit('admin_lua_payload', logEntry);
  }

  return logEntry;
};

/**
 * Get all logged Lua payloads
 */
const getPayloadLogs = () => logs;

/**
 * Clear log buffer
 */
const clearPayloadLogs = () => {
  logs.length = 0;
  return true;
};

module.exports = {
  addPayloadLog,
  getPayloadLogs,
  clearPayloadLogs,
};
