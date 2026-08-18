const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');
const mockStore = require('../utils/mockStore');
const { securityLogger } = require('../middleware/logging');

module.exports = function (passport) {
  const cleanEnv = (val) => {
    if (!val) return '';
    return val.toString().trim().replace(/^["']|["']$/g, '').replace(/[\r\n\t]/g, '');
  };

  const googleClientId = cleanEnv(process.env.GOOGLE_CLIENT_ID);
  const googleClientSecret = cleanEnv(process.env.GOOGLE_CLIENT_SECRET);
  const googleCallbackUrl = 'https://quan-ly-acc-viet-nam.onrender.com/auth/google/callback';

  const facebookAppId = cleanEnv(process.env.FACEBOOK_APP_ID) || '1234567890';
  const facebookAppSecret = cleanEnv(process.env.FACEBOOK_APP_SECRET) || 'dummy_facebook_secret';
  const facebookCallbackUrl = 'https://quan-ly-acc-viet-nam.onrender.com/auth/facebook/callback';

  securityLogger.info('Passport initialization check', {
    googleClientId,
    facebookAppId,
    googleCallbackUrl,
    facebookCallbackUrl
  });

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

  // ───── Facebook OAuth 2.0 Strategy ─────
  const facebookStrat = new FacebookStrategy(
    {
      clientID: facebookAppId,
      clientSecret: facebookAppSecret,
      callbackURL: facebookCallbackUrl,
      profileFields: ['id', 'displayName', 'emails', 'photos'],
      graphApiVersion: 'v20.0',
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `fb_${profile.id}@facebook.user`;
      const username = profile.displayName || `FB_User_${profile.id}`;
      const facebookId = profile.id;
      const facebookAvatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : `https://graph.facebook.com/${profile.id}/picture?type=large`;
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      try {
        if (!global.dbConnected) {
          let user = mockStore.findUserByFacebookId(facebookId) || mockStore.findUserByEmail(email);
          if (!user) {
            user = mockStore.createUser(username, email, null, null, null, facebookAvatarUrl, '0', facebookId);
          } else {
            if (!user.facebookId) user.facebookId = facebookId;
            if (facebookAvatarUrl) user.avatar = facebookAvatarUrl;
          }
          return done(null, user);
        }

        // 1. Find user by facebookId
        let user = await User.findOne({ facebookId });
        if (user) {
          if (facebookAvatarUrl && user.avatar !== facebookAvatarUrl) {
            user.avatar = facebookAvatarUrl;
            await user.save();
          }
          return done(null, user);
        }

        // 2. Find user by email and link facebookId
        user = await User.findOne({ email });
        if (user) {
          user.facebookId = facebookId;
          if (facebookAvatarUrl) user.avatar = facebookAvatarUrl;
          await user.save();
          return done(null, user);
        }

        // 3. Create new user
        user = await User.create({
          username,
          email,
          facebookId,
          avatar: facebookAvatarUrl,
          creationIp: ip,
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  );

  if (facebookStrat._oauth2) {
    facebookStrat._oauth2._customHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 OceanForgeAuth/1.0'
    };
  }

  passport.use(facebookStrat);

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
