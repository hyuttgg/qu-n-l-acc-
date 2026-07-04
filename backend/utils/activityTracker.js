const Account = require('../models/Account');
const Session = require('../models/Session');
const mockStore = require('./mockStore');

const OFFLINE_TIMEOUT = 60 * 1000; // 1 minute in milliseconds

const startActivityTracker = (io) => {
  console.log('Activity tracker background worker started.');

  setInterval(async () => {
    try {
      const now = Date.now();

      if (global.dbConnected) {
        // 1. Database Mode
        // Find accounts that are currently online (not 'offline') and haven't been seen in the last 1 minute
        const inactiveAccounts = await Account.find({
          status: { $ne: 'offline' },
          lastSeen: { $lt: new Date(now - OFFLINE_TIMEOUT) }
        });

        for (const account of inactiveAccounts) {
          console.log(`[ActivityTracker] Account ${account.robloxUsername} is inactive. Marking as offline.`);
          account.status = 'offline';
          await account.save();

          // Close active session
          const activeSession = await Session.findOne({ accountId: account._id, online: true });
          if (activeSession) {
            activeSession.online = false;
            activeSession.endTime = now;
            activeSession.duration = Math.floor((activeSession.endTime - activeSession.startTime) / 1000);
            await activeSession.save();
          }

          // Emit real-time update via Socket.io to the user's private room
          const userIdStr = account.userId.toString();
          io.to(userIdStr).emit('account_update', {
            account,
            activeSession: activeSession || null
          });
        }
      } else {
        // 2. Mock Mode
        const store = mockStore.store;
        const inactiveMockAccounts = store.accounts.filter(
          acc => acc.status !== 'offline' && (now - new Date(acc.lastSeen).getTime()) > OFFLINE_TIMEOUT
        );

        for (const account of inactiveMockAccounts) {
          console.log(`[ActivityTracker Mock] Account ${account.robloxUsername} is inactive. Marking as offline.`);
          account.status = 'offline';

          // Close active session
          const activeSession = store.sessions.find(s => s.accountId === account.id && s.online);
          if (activeSession) {
            activeSession.online = false;
            activeSession.endTime = new Date();
            activeSession.duration = Math.floor((activeSession.endTime.getTime() - activeSession.startTime.getTime()) / 1000);
          }

          // Emit real-time update via Socket.io to the user's private room
          const userIdStr = account.userId.toString();
          io.to(userIdStr).emit('account_update', {
            account,
            activeSession: activeSession || null
          });
        }
      }
    } catch (error) {
      console.error('[ActivityTracker] Error checking inactive accounts:', error);
    }
  }, 10000); // Check every 10 seconds
};

module.exports = { startActivityTracker };
