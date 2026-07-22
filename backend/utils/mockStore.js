const crypto = require('crypto');

// Global mock memory store
global.mockStore = global.mockStore || {
  users: [],
  accounts: [],
  sessions: [],
  inventories: [],
  logs: [],
  loginHistories: [],
};

const store = global.mockStore;

module.exports = {
  store,
  
  // Users
  findUserByEmail: (email) => store.users.find(u => u.email === email),
  findUserByUsername: (username) => store.users.find(u => u.username === username),
  findUserById: (id) => store.users.find(u => u.id === id.toString()),
  findUserByApiKey: (apiKey) => store.users.find(u => u.apiKey === apiKey),
  findUserByDiscordId: (discordId) => store.users.find(u => u.discordId === discordId),
  createUser: (username, email, password, googleId = null, discordId = null, avatar = null) => {
    const userId = Math.random().toString(36).substr(2, 9);
    const newUser = {
      id: userId,
      _id: userId, // compat
      username,
      email,
      password, // simple check
      role: 'user',
      googleId,
      discordId,
      avatar,
      apiKey: 'forge_' + crypto.randomBytes(24).toString('hex'),
      createdAt: new Date(),
      save: async function() { return this; }
    };
    store.users.push(newUser);
    return newUser;
  },
  
  // Accounts
  findAccountsByUserId: (userId) => store.accounts.filter(a => a.userId === userId.toString()),
  findAccountById: (id) => store.accounts.find(a => a.id === id.toString() || a._id === id.toString()),
  findAccountByRobloxName: (userId, name) => store.accounts.find(a => a.userId === userId.toString() && a.robloxUsername === name),
  createAccount: (userId, robloxUsername) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newAcc = {
      id,
      _id: id,
      userId: userId.toString(),
      robloxUsername,
      level: 1,
      beli: 0,
      fragments: 0,
      sea: 1,
      race: 'Human',
      equipped: { fruit: 'None', fruitMastery: 0, sword: 'None', gun: 'None', fightingStyle: 'Combat', accessory: 'None' },
      status: 'offline',
      location: 'Starter Island',
      playtime: 0,
      notes: '',
      lastSeen: new Date(),
      createdAt: new Date(),
      save: async function() { return this; }
    };
    store.accounts.push(newAcc);
    return newAcc;
  },
  
  // Sessions
  findActiveSession: (accountId) => store.sessions.find(s => s.accountId === accountId.toString() && s.online),
  createSession: (accountId) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newSess = {
      id,
      _id: id,
      accountId: accountId.toString(),
      startTime: new Date(),
      online: true,
      duration: 0,
      save: async function() { return this; }
    };
    store.sessions.push(newSess);
    return newSess;
  },
  
  // Inventories
  findInventory: (accountId) => store.inventories.find(i => i.accountId === accountId.toString()),
  createInventory: (accountId) => {
    const newInv = {
      accountId: accountId.toString(),
      fruits: [],
      weapons: [],
      guns: [],
      styles: [],
      materials: [],
      accessories: [],
      lastUpdated: new Date(),
      save: async function() { return this; }
    };
    store.inventories.push(newInv);
    return newInv;
  },
  
  // Logs
  findLogs: (accountId) => store.logs.filter(l => l.accountId === accountId.toString()),
  addLog: (accountId, type, description) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newLog = {
      id,
      _id: id,
      accountId: accountId.toString(),
      type,
      description,
      timestamp: new Date()
    };
    store.logs.push(newLog);
    return newLog;
  },

  // Failed attempts tracking (In-Memory fallback)
  getFailedAttempts: (ip, email) => {
    store.failedAttempts = store.failedAttempts || [];
    const now = Date.now();
    // Auto-expire records older than 15 minutes (900000 ms)
    store.failedAttempts = store.failedAttempts.filter(fa => now - fa.lastAttempt < 900000);
    
    const record = store.failedAttempts.find(fa => fa.ip === ip && fa.email === email.toLowerCase());
    return record ? record.attempts : 0;
  },
  
  incrementFailedAttempts: (ip, email) => {
    store.failedAttempts = store.failedAttempts || [];
    const now = Date.now();
    const index = store.failedAttempts.findIndex(fa => fa.ip === ip && fa.email === email.toLowerCase());
    if (index !== -1) {
      store.failedAttempts[index].attempts += 1;
      store.failedAttempts[index].lastAttempt = now;
    } else {
      store.failedAttempts.push({ ip, email: email.toLowerCase(), attempts: 1, lastAttempt: now });
    }
  },
  
  resetFailedAttempts: (ip, email) => {
    store.failedAttempts = store.failedAttempts || [];
    store.failedAttempts = store.failedAttempts.filter(fa => !(fa.ip === ip && fa.email === email.toLowerCase()));
  },
  
  saveLoginHistory: (data) => {
    store.loginHistories = store.loginHistories || [];
    const newHistory = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      loginTime: new Date()
    };
    store.loginHistories.push(newHistory);
    return newHistory;
  },

  deleteUser: (userId) => {
    const idStr = userId.toString();
    store.users = store.users.filter(u => u.id !== idStr);
    const accounts = store.accounts.filter(a => a.userId === idStr);
    const accountIds = accounts.map(a => a.id);
    store.inventories = store.inventories.filter(i => !accountIds.includes(i.accountId));
    store.sessions = store.sessions.filter(s => !accountIds.includes(s.accountId));
    store.logs = store.logs.filter(l => !accountIds.includes(l.accountId));
    store.accounts = store.accounts.filter(a => a.userId !== idStr);
    if (store.loginHistories) {
      store.loginHistories = store.loginHistories.filter(lh => lh.userId !== idStr);
    }
  }
};

