const mongoose = require('mongoose');

const LoginHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  loginTime: {
    type: Date,
    default: Date.now,
  },
  ip: {
    type: String,
    required: true,
  },
  os: {
    type: String,
    required: true,
  },
  browser: {
    type: String,
    required: true,
  },
  success: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model('LoginHistory', LoginHistorySchema);
