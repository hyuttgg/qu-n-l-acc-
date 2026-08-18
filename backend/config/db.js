const mongoose = require('mongoose');
const EventEmitter = require('events');

// ═══════════════════════════════════════
// DATABASE CONNECTION EVENT BUS
// ═══════════════════════════════════════
// Self-healing engine subscribes to these events for auto-recovery
const dbEvents = new EventEmitter();

const connectDB = async () => {
  const atlasUri = process.env.MONGODB_URI;
  const localUri = 'mongodb://127.0.0.1:27017/oceanforge';

  // ── MongoDB Connection State Listeners (for Self-Healing Engine) ──
  mongoose.connection.on('disconnected', () => {
    console.warn('[DB Event] MongoDB disconnected — Self-healing engine will attempt reconnect.');
    global.dbConnected = false;
    dbEvents.emit('db_disconnected', { source: 'mongoose', timestamp: new Date() });
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[DB Event] MongoDB reconnected successfully.');
    global.dbConnected = true;
    dbEvents.emit('db_reconnected', { source: 'mongoose', timestamp: new Date() });
  });

  mongoose.connection.on('error', (err) => {
    console.error('[DB Event] MongoDB connection error:', err.message);
    dbEvents.emit('db_error', { source: 'mongoose', error: err.message, timestamp: new Date() });
  });

  try {
    console.log('Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(atlasUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`MongoDB Connected (Atlas): ${conn.connection.host}`);
    global.dbConnected = true;
  } catch (error) {
    console.error(`MongoDB Atlas Connection Failed: ${error.message}`);
    console.warn('TIP: If connection timed out, ensure your MongoDB Atlas project has "Network Access" configured to "Allow Access From Anywhere" (0.0.0.0/0) or whitelisted your current IP address.');
    console.log('Attempting local MongoDB fallback connection...');
    
    try {
      const conn = await mongoose.connect(localUri, {
        serverSelectionTimeoutMS: 3000
      });
      console.log(`MongoDB Connected (Local): ${conn.connection.host}`);
      global.dbConnected = true;
    } catch (localError) {
      console.error(`Local MongoDB Connection Failed: ${localError.message}`);
      console.error('CRITICAL: Database connections failed.');
      console.log('>>> OceanForge is running in MOCK DATABASE mode (in-memory) for testing purposes.');
      global.dbConnected = false;
    }
  }
};

module.exports = connectDB;
module.exports.dbEvents = dbEvents;
