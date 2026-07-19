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

  const discordClientId = cleanEnv(process.env.DISCORD_CLIENT_ID);
  const discordClientSecret = cleanEnv(process.env.DISCORD_CLIENT_SECRET);
  const discordCallbackUrl = cleanEnv(process.env.DISCORD_CALLBACK_URL) || 'http://localhost:5000/auth/discord/callback';
  const googleClientId = cleanEnv(process.env.GOOGLE_CLIENT_ID);
  const googleClientSecret = cleanEnv(process.env.GOOGLE_CLIENT_SECRET);
  const googleCallbackUrl = cleanEnv(process.env.GOOGLE_CALLBACK_URL) || 'http://localhost:5000/api/auth/google/callback';

  securityLogger.info('Passport initialization check', {
    discordClientId,
    discordClientSecretLength: discordClientSecret ? discordClientSecret.length : 0,
    discordCallbackUrl,
    googleClientId,
    googleClientSecretLength: googleClientSecret ? googleClientSecret.length : 0,
    googleCallbackUrl
  });

  passport.use(
    new DiscordStrategy(
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
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        try {
          // If DB connection is fallback/offline
          if (!global.dbConnected) {
            let user = mockStore.findUserByDiscordId(discordId) || (email ? mockStore.findUserByEmail(email) : null);
            if (user) {
              if (!user.discordId) {
                user.discordId = discordId;
              }
              return done(null, user);
            }

            user = mockStore.createUser(
              displayName.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 15) + '_' + Math.random().toString(36).substring(2, 5),
              email || `${discordId}@discord.mock`,
              null,
              null,
              discordId
            );
            return done(null, user);
          }

          // Database connected path
          // Look up user by Discord ID or Email
          let user = null;
          if (email) {
            user = await User.findOne({ $or: [{ discordId }, { email }] });
          } else {
            user = await User.findOne({ discordId });
          }

          if (user) {
            // Link discordId if user registered via email previously
            if (!user.discordId) {
              user.discordId = discordId;
              await user.save();
            }
            return done(null, user);
          }

          // SECURITY CHECK: Multiple Discord accounts created on a single IP (limit to 3)
          const discordCountOnIp = await User.countDocuments({
            creationIp: ip,
            discordId: { $exists: true }
          });
          if (discordCountOnIp >= 3) {
            return done(new Error('ip_limit'), null);
          }

          // Create new user
          const cleanedName = displayName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
          const username = (cleanedName.length > 15 ? cleanedName.substring(0, 15) : cleanedName) + '_' + Math.random().toString(36).substring(2, 5);

          user = await User.create({
            username,
            email: email || `${discordId}@discord.auth`,
            discordId,
            creationIp: ip,
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  // ───── Google OAuth 2.0 Strategy ─────
  passport.use(
    new GoogleStrategy(
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
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        try {
          if (!global.dbConnected) {
            // In-memory mock store
            let user = mockStore.findUserByEmail(email);
            if (!user) {
              user = mockStore.createUser(username, email, null);
              user.googleId = googleId;
            } else if (!user.googleId) {
              user.googleId = googleId;
            }
            return done(null, user);
          }

          // 1. Find user by googleId
          let user = await User.findOne({ googleId });
          if (user) {
            return done(null, user);
          }

          // 2. Find user by email and link googleId if it doesn't have one
          user = await User.findOne({ email });
          if (user) {
            user.googleId = googleId;
            await user.save();
            return done(null, user);
          }

          // 3. Create a new user
          user = await User.create({
            username,
            email,
            googleId,
            creationIp: ip,
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

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
