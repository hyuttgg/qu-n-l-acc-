const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  },
  duration: {
    type: Number, // in seconds
    default: 0,
  },
  online: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model('Session', SessionSchema);
