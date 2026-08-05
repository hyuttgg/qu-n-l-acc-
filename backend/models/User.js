const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/cryptoHelper');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please add a username'],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  password: {
    type: String,
    required: function() {
      // Required only if creating a new non-OAuth user
      if (this.isNew && !this.googleId && !this.discordId) return true;
      return false;
    },
    minlength: 6,
    select: false,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  discordId: {
    type: String,
    unique: true,
    sparse: true,
  },
  discriminator: {
    type: String,
    default: '0',
  },
  avatar: {
    type: String,
    default: null,
  },
  nickname: {
    type: String,
    unique: true,
    sparse: true,
  },
  userCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  role: {
    type: String,
    enum: ['Owner', 'Admin', 'Moderator', 'Developer', 'Premium', 'VIP', 'Member', 'Guest', 'user', 'admin'],
    default: 'Member',
  },
  joinDate: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  loginCount: {
    type: Number,
    default: 1,
  },
  apiKey: {
    type: String,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  creationIp: {
    type: String,
  },
});

UserSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ───── Generate API key before saving if not present ─────
UserSchema.pre('save', async function (next) {
  if (!this.apiKey) {
    this.apiKey = 'forge_' + crypto.randomBytes(24).toString('hex');
  }

  // Generate User Code and Nickname if missing
  const { generateUserCode, generateNickname } = require('../utils/identityGenerator');
  if (!this.userCode) {
    this.userCode = await generateUserCode();
  }
  if (!this.nickname) {
    this.nickname = await generateNickname();
  }

  next();
});

// ───── Match user entered password to hashed password in database ─────
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
