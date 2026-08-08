const DiscordStrategy = require('passport-discord').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const mockStore = require('../utils/mockStore');
const { securityLogger } = require('../middleware/logging');

module.exports = function (passport) {
  const cleanEnv = (val) => {
    if (!val) return '';
    return val.toString().trim().replace(/[\r\n\t]/g, '');
  };

  const getCleanCallback = (envVal, defaultPath) => {
    let raw = cleanEnv(envVal);
    if (raw.includes('manageblox.io.vn')) {
      raw = raw.replace(/api\.manageblox\.io\.vn|manageblox\.io\.vn/g, 'quan-ly-acc-viet-nam.onrender.com');
    }
    if (!raw) {
      const host = process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_URL || 'https://quan-ly-acc-viet-nam.onrender.com';
      return `${host.replace(/\/+$/, '')}${defaultPath}`;
    }
    if (!/^https?:\/\//i.test(raw)) {
      raw = `https://${raw}`;
    }
    // Guarantee /api prefix for Nginx proxy pass compatibility
    if (!raw.includes('/api/') && raw.includes('/auth/')) {
      raw = raw.replace('/auth/', '/api/auth/');
    }
    return raw;
  };

  const discordClientId = cleanEnv(process.env.DISCORD_CLIENT_ID);
  const discordClientSecret = cleanEnv(process.env.DISCORD_CLIENT_SECRET);
  const discordCallbackUrl = getCleanCallback(process.env.DISCORD_CALLBACK_URL, '/api/auth/discord/callback');
  const googleClientId = cleanEnv(process.env.GOOGLE_CLIENT_ID);
  const googleClientSecret = cleanEnv(process.env.GOOGLE_CLIENT_SECRET);
  const googleCallbackUrl = getCleanCallback(process.env.GOOGLE_CALLBACK_URL, '/api/auth/google/callback');

  securityLogger.info('Passport initialization check', {
    discordClientId,
    discordClientSecretLength: discordClientSecret ? discordClientSecret.length : 0,
    discordCallbackUrl,
    googleClientId,
    googleClientSecretLength: googleClientSecret ? googleClientSecret.length : 0,
    googleCallbackUrl
  });

  const discordStrat = new DiscordStrategy(
    {
      clientID: discordClientId,
      clientSecret: discordClientSecret,
      callbackURL: discordCallbackUrl,
      scope: ['identify', 'email'],
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      const email = profile.email || null;
      const displayName = profile.global_name || profile.username || 'DiscordUser';
      const discordId = profile.id;
      const rawIp = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const ip = rawIp.split(',')[0].trim();
      const isLocalhostOrPrivate = 
        ip === '127.0.0.1' || 
        ip === '::1' || 
        ip.includes('127.0.0.1') || 
        ip.startsWith('192.168.') || 
        ip.startsWith('10.') || 
        ip.startsWith('172.16.') || 
        ip.startsWith('172.31.');

      // Construct Discord Avatar CDN URL
      let avatarUrl = null;
      if (profile.avatar) {
        const format = profile.avatar.startsWith('a_') ? 'gif' : 'png';
        avatarUrl = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`;
      } else if (profile.discriminator && profile.discriminator !== '0') {
        avatarUrl = `https://cdn.discordapp.com/embed/avatars/${parseInt(profile.discriminator) % 5}.png`;
      } else {
        try {
          const defaultIndex = (BigInt(profile.id) >> 22n) % 6n;
          avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
        } catch (e) {
          avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';
        }
      }

      try {
        const { generateUserCode, generateNickname } = require('../utils/identityGenerator');
        const discriminator = profile.discriminator || '0';

        // If DB connection is fallback/offline
        if (!global.dbConnected) {
          let user = mockStore.findUserByDiscordId(discordId) || (email ? mockStore.findUserByEmail(email) : null);
          if (user) {
            if (!user.discordId) user.discordId = discordId;
            user.avatar = avatarUrl;
            user.discriminator = discriminator;
            user.lastLogin = new Date();
            user.loginCount = (user.loginCount || 0) + 1;
            return done(null, user);
          }

          user = mockStore.createUser(
            displayName.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 15) + '_' + Math.random().toString(36).substring(2, 5),
            email || `${discordId}@discord.mock`,
            null,
            null,
            discordId,
            avatarUrl,
            discriminator
          );
          return done(null, user);
        }

        // Database connected path
        // Look up user strictly by Discord ID first, or by valid non-empty Email
        let user = null;
        if (email && email.trim()) {
          user = await User.findOne({ $or: [{ discordId }, { email: email.trim() }] });
        } else {
          user = await User.findOne({ discordId });
        }

        if (user) {
          // Update fields & metrics on login
          if (!user.discordId) user.discordId = discordId;
          user.avatar = avatarUrl;
          user.discriminator = discriminator;
          user.lastLogin = new Date();
          user.loginCount = (user.loginCount || 0) + 1;

          if (!user.userCode) {
            user.userCode = await generateUserCode();
          }
          if (!user.nickname) {
            user.nickname = await generateNickname();
          }

          await user.save();
          return done(null, user);
        }

        // SECURITY CHECK: Multiple Discord accounts created on a single IP (exempt local/private IPs, max 10 for public IPs)
        if (!isLocalhostOrPrivate) {
          const discordCountOnIp = await User.countDocuments({
            creationIp: ip,
            discordId: { $exists: true }
          });
          if (discordCountOnIp >= 10) {
            return done(new Error('ip_limit'), null);
          }
        }

        // Create new user with full Identity metadata
        const cleanedName = displayName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
        const username = (cleanedName.length > 15 ? cleanedName.substring(0, 15) : cleanedName) + '_' + Math.random().toString(36).substring(2, 5);

        const userCode = await generateUserCode();
        const nickname = await generateNickname();

        user = await User.create({
          username,
          email: email || `${discordId}@discord.auth`,
          discordId,
          discriminator,
          avatar: avatarUrl,
          nickname,
          userCode,
          role: 'Member',
          joinDate: new Date(),
          lastLogin: new Date(),
          loginCount: 1,
          creationIp: ip,
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  );

  if (discordStrat._oauth2) {
    discordStrat._oauth2._customHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 OceanForgeAuth/1.0'
    };
  }

  passport.use(discordStrat);

  // ───── Google OAuth 2.0 Strategy ─────
  const googleStrat = new GoogleStrategy(
    {
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: googleCallbackUrl,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        if (!email) {
          return done(new Error('Google Account has no email associated'), null);
        }

        const username = profile.displayName || (profile.name ? profile.name.givenName : null) || email.split('@')[0];
        const googleId = profile.id;
        const googleAvatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        try {
          if (!global.dbConnected) {
            // In-memory mock store
            let user = mockStore.findUserByEmail(email);
            if (!user) {
              user = mockStore.createUser(username, email, null, googleId, null, googleAvatarUrl);
            } else {
              if (!user.googleId) user.googleId = googleId;
              if (googleAvatarUrl) user.avatar = googleAvatarUrl;
            }
            return done(null, user);
          }

          // 1. Find user by googleId
          let user = await User.findOne({ googleId });
          if (user) {
            if (googleAvatarUrl && user.avatar !== googleAvatarUrl) {
              user.avatar = googleAvatarUrl;
              await user.save();
            }
            return done(null, user);
          }

          // 2. Find user by email and link googleId if it doesn't have one
          user = await User.findOne({ email });
          if (user) {
            user.googleId = googleId;
            if (googleAvatarUrl) user.avatar = googleAvatarUrl;
            await user.save();
            return done(null, user);
          }

          // 3. Create a new user
          user = await User.create({
            username,
            email,
            googleId,
            avatar: googleAvatarUrl,
            creationIp: ip,
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    );

  if (googleStrat._oauth2) {
    googleStrat._oauth2._customHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 OceanForgeAuth/1.0'
    };
  }

  passport.use(googleStrat);

  passport.serializeUser((user, done) => {
    done(null, user.id || user._id);
  });

  passport.deserializeUser(async (id, done) => {
    if (!global.dbConnected) {
      const user = mockStore.findUserById(id);
      return done(null, user);
    }
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
