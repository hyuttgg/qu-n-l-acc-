const mongoose = require('mongoose');

const LeviathanSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  robloxUsername: {
    type: String,
    required: true,
    trim: true,
  },
  serverId: {
    type: String,
    default: 'Unknown',
  },
  status: {
    type: String,
    enum: ['Not Started', 'Searching', 'Activated', 'Fighting', 'Heart Obtained', 'Finished'],
    default: 'Not Started',
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: {
    type: Date,
  },
  duration: {
    type: Number, // in seconds
    default: 0,
  },
  progress: {
    spyMessage: { type: String, default: '' },
    spyStatus: { type: String, enum: ['Unknown', 'Leviathan Available', 'Other'], default: 'Unknown' },
    dangerLevel: { type: Number, default: 1 },
    frozenDetected: { type: Boolean, default: false },
    frozenTime: { type: Date },
    frozenSea: { type: Number },
    frozenCoordinates: { type: String, default: '' },
    heartStatus: { type: String, enum: ['Not Obtained', 'Obtained', 'Transporting', 'Arrived', 'Lost'], default: 'Not Obtained' },
    destination: { type: String, default: '' },
    remainingDistance: { type: Number, default: 0 },
    arrivalTime: { type: Date },
    currentStage: { type: String, default: 'Not Started' },
  },
  team: [{
    username: { type: String },
    alive: { type: Boolean, default: true },
    dead: { type: Boolean, default: false },
    joinTime: { type: Date, default: Date.now },
    leaveTime: { type: Date }
  }],
  rewards: {
    scale: { type: Number, default: 0 },
    fins: { type: Number, default: 0 },
    heart: { type: Number, default: 0 },
    fragments: { type: Number, default: 0 },
    exp: { type: Number, default: 0 },
    otherDrop: { type: [String], default: [] }
  },
  battleStats: {
    damagePhase: { type: Number, default: 0 },
    membersAlive: { type: Number, default: 0 },
    membersDead: { type: Number, default: 0 },
    disconnectCount: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('LeviathanSession', LeviathanSessionSchema);
