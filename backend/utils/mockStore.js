const crypto = require('crypto');

// Global mock memory store
global.mockStore = global.mockStore || {
  users: [],
  accounts: [],
  sessions: [],
  inventories: [],
  logs: [],
};

const store = global.mockStore;

module.exports = {
  store,
  
  // Users
  findUserByEmail: (email) => store.users.find(u => u.email === email),
  findUserByUsername: (username) => store.users.find(u => u.username === username),
  findUserById: (id) => store.users.find(u => u.id === id.toString()),
  findUserByApiKey: (apiKey) => store.users.find(u => u.apiKey === apiKey),
  createUser: (username, email, password) => {
    const userId = Math.random().toString(36).substr(2, 9);
    const newUser = {
      id: userId,
      _id: userId, // compat
      username,
      email,
      password, // simple check
      role: 'user',
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
      equipped: { fruit: 'None', fruitMastery: 0, sword: 'None', gun: 'None', fightingStyle: 'Combat' },
      status: 'offline',
      location: 'Starter Island',
      playtime: 0,
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
  }
};
