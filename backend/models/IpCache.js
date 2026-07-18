const mongoose = require('mongoose');

const IpCacheSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  country: {
    type: String,
    default: '',
  },
  countryCode: {
    type: String,
    default: '',
  },
  region: {
    type: String,
    default: '',
  },
  city: {
    type: String,
    default: '',
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  isp: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 30 * 24 * 60 * 60, // Automatically expire document after 30 days (TTL index)
  },
});

module.exports = mongoose.model('IpCache', IpCacheSchema);
