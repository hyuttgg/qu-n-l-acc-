const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['level_up', 'item_drop', 'fruit_obtained', 'status_change', 'connection', 'error'],
  },
  description: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Index for query optimization
LogSchema.index({ accountId: 1, timestamp: -1 });

module.exports = mongoose.model('Log', LogSchema);
