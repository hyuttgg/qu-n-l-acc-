const mongoose = require('mongoose');

const LoginAttemptSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    required: true,
    default: 1,
  },
  lastAttempt: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

// Compound index on IP and Email
LoginAttemptSchema.index({ ip: 1, email: 1 }, { unique: true });

// Auto-expire attempts after 15 minutes (900 seconds)
LoginAttemptSchema.index({ lastAttempt: 1 }, { expireAfterSeconds: 900 });

module.exports = mongoose.model('LoginAttempt', LoginAttemptSchema);
