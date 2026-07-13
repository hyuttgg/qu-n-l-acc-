const LoginAttempt = require('../models/LoginAttempt');
const mockStore = require('./mockStore');

const getAttempts = async (ip, email) => {
  if (!global.dbConnected) {
    return mockStore.getFailedAttempts(ip, email);
  }
  try {
    const record = await LoginAttempt.findOne({ ip, email: email.toLowerCase() });
    return record ? record.attempts : 0;
  } catch (error) {
    console.error('Error getting login attempts from database:', error);
    return 0;
  }
};

const incrementAttempts = async (ip, email) => {
  if (!global.dbConnected) {
    mockStore.incrementFailedAttempts(ip, email);
    return;
  }
  try {
    await LoginAttempt.findOneAndUpdate(
      { ip, email: email.toLowerCase() },
      { $inc: { attempts: 1 }, lastAttempt: new Date() },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error incrementing login attempts in database:', error);
  }
};

const resetAttempts = async (ip, email) => {
  if (!global.dbConnected) {
    mockStore.resetFailedAttempts(ip, email);
    return;
  }
  try {
    await LoginAttempt.deleteOne({ ip, email: email.toLowerCase() });
  } catch (error) {
    console.error('Error resetting login attempts in database:', error);
  }
};

module.exports = {
  getAttempts,
  incrementAttempts,
  resetAttempts
};
