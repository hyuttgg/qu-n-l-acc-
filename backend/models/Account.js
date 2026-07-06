const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  robloxUsername: {
    type: String,
    required: true,
    trim: true,
  },
  level: {
    type: Number,
    default: 1,
  },
  beli: {
    type: Number,
    default: 0,
  },
  fragments: {
    type: Number,
    default: 0,
  },
  sea: {
    type: Number,
    default: 1,
  },
  race: {
    type: String,
    default: 'Human',
  },
  equipped: {
    fruit: { type: String, default: 'None' },
    fruitMastery: { type: Number, default: 0 },
    sword: { type: String, default: 'None' },
    gun: { type: String, default: 'None' },
    fightingStyle: { type: String, default: 'Combat' },
    accessory: { type: String, default: 'None' },
  },
  status: {
    type: String,
    enum: ['offline', 'idle', 'grinding', 'bossing', 'sea_event', 'trading'],
    default: 'offline',
  },
  location: {
    type: String,
    default: 'Starter Island',
  },
  playtime: {
    type: Number, // total accumulated playtime in seconds
    default: 0,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound unique key to make sure a user's account name is unique
AccountSchema.index({ userId: 1, robloxUsername: 1 }, { unique: true });

module.exports = mongoose.model('Account', AccountSchema);
