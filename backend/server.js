require('dotenv').config({ override: true }); // Trigger nodemon restart
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cookieParser = require('cookie-parser');

// ───── Config ─────
const connectDB = require('./config/db');
const securityConfig = require('./config/security.config');
const passport = require('passport');
require('./config/passport')(passport);

// ───── Security Middleware Imports ─────
const helmetConfig = require('./middleware/helmetConfig');
const corsConfig = require('./middleware/corsConfig');
const { generalLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/sanitize');
const { securityLogger } = require('./middleware/logging');

// Connect to Database
connectDB();

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Render, Vercel, Heroku, etc.)
const server = http.createServer(app);

// ══════════════════════════════════════
// SECURITY MIDDLEWARE STACK (order matters!)
// ══════════════════════════════════════

// Layer 1: HTTP Security Headers (CSP, HSTS, X-Frame-Options, hide x-powered-by)
app.use(helmetConfig);

// Layer 2: Cookie Parser (required for CSRF token reading)
app.use(cookieParser());

// Layer 3: CORS — Restricted origin whitelist (replaces cors({ origin: '*' }))
app.use(corsConfig);

// Layer 4: Global Rate Limiting (100 req / 15 min per IP)
app.use(generalLimiter);

// Layer 5: Body Parsers
app.use(express.json({ limit: '2mb' })); // Body size limit

// Layer 6: Input Sanitization (XSS + NoSQL Injection protection)
app.use(sanitizeInput);

// Initialize Passport for OAuth
app.use(passport.initialize());

// ══════════════════════════════════════
// STATIC ASSETS
// ══════════════════════════════════════
const imagesPath = path.join(__dirname, '../ảnh');
app.use('/api/images', express.static(imagesPath, { maxAge: '1d', etag: true }));
console.log(`Static asset folder mapped: serving "/api/images" with 24h caching from "${imagesPath}"`);

// ══════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════
app.use('/api/auth', require('./routes/auth'));
app.use('/auth', require('./routes/auth'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/lua', require('./routes/lua'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/map', require('./routes/map'));

// ══════════════════════════════════════
// API DOCUMENTATION (SWAGGER)
// ══════════════════════════════════════
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec, swaggerOptions } = require('./config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

// ══════════════════════════════════════
// FALLBACK ERROR HANDLERS
// ══════════════════════════════════════
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Resource not found' });
});

// Global error handler — catches unhandled errors and logs them
app.use((err, req, res, next) => {
  if (err.name === 'TokenError' || err.code) {
    console.error('--- PASSPORT TOKEN ERROR DEBUG ---');
    console.error('Error Name:', err.name);
    console.error('Error Message:', err.message);
    console.error('Error Code:', err.code);
    console.error('Error Status:', err.status);
    console.error('Error Description:', err.description || (err.headers && JSON.stringify(err.headers)));
    console.error('---------------------------------');

    securityLogger.error('Passport TokenError details', {
      errorName: err.name,
      errorMessage: err.message,
      errorCode: err.code,
      errorStatus: err.status,
      errorDesc: err.description || (err.headers && JSON.stringify(err.headers))
    });
  }

  securityLogger.error('Unhandled server error', {
    error: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ══════════════════════════════════════
// SOCKET.IO — Secured with JWT verify & room isolation
// ══════════════════════════════════════
const jwt = require('jsonwebtoken');

const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOriginStr = origin.trim().replace(/[\r\n\t]/g, '');
      const isAllowed = 
        securityConfig.cors.allowedOrigins.some(allowed => cleanOriginStr.startsWith(allowed)) ||
        cleanOriginStr.endsWith('.vercel.app') ||
        cleanOriginStr.includes('manageblox.io.vn') ||
        cleanOriginStr.includes('localhost') ||
        cleanOriginStr.includes('127.0.0.1');

      if (isAllowed) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// Socket.io JWT Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Socket authentication failed: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, securityConfig.jwt.secret);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    securityLogger.warn('Socket JWT verification failed', {
      socketId: socket.id,
      error: err.message
    });
    return next(new Error('Socket authentication failed: Invalid token'));
  }
});

// Store io instance on app for route access
app.set('io', io);

// Start background activity tracker to detect offline accounts in real-time
const { startActivityTracker } = require('./utils/activityTracker');
startActivityTracker(io);

const User = require('./models/User');
const mockStore = require('./utils/mockStore');
const { lookupIp } = require('./utils/geoLookup');
const { getDeviceDetails } = require('./utils/deviceParser');

io.on('connection', async (socket) => {
  console.log(`Socket connected: ${socket.id} (User: ${socket.userId})`);

  // Auto-join user to their private room
  if (socket.userId) {
    socket.join(socket.userId);
  }

  socket.on('join_room', (userId) => {
    // Only allow joining own room (prevents room snooping)
    if (userId && userId === socket.userId) {
      socket.join(userId);
    }
  });

  // Track active socket sessions for geolocating website users
  if (socket.userId) {
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    const userAgent = socket.handshake.headers['user-agent'] || '';
    const { os, browser } = getDeviceDetails(userAgent);

    let userObj = null;
    try {
      if (global.dbConnected) {
        userObj = await User.findById(socket.userId);
      } else {
        userObj = mockStore.findUserById(socket.userId);
      }
    } catch (err) {
      console.error('Socket user fetch error:', err.message);
    }

    if (userObj) {
      const geo = await lookupIp(ip);
      const loginMethod = userObj.discordId ? 'Discord' : (userObj.googleId ? 'Google' : 'Email');

      const activeSession = {
        socketId: socket.id,
        userId: userObj._id || userObj.id,
        username: userObj.username,
        email: userObj.email || '',
        loginMethod,
        ip,
        os,
        browser,
        lat: geo.latitude,
        lng: geo.longitude,
        country: geo.country,
        province: geo.region || geo.city || 'Unknown',
        city: geo.city || 'Unknown',
        district: geo.city || 'Unknown',
        ping: 0,
        startTime: new Date(),
      };

      global.activeUserSessions = global.activeUserSessions || new Map();
      global.activeUserSessions.set(socket.id, activeSession);

      // Broadcast user going online
      io.emit('user_online', {
        id: activeSession.userId.toString(),
        username: activeSession.username,
        province: activeSession.province,
        lat: activeSession.lat,
        lng: activeSession.lng,
        online: true,
        os: activeSession.os,
        browser: activeSession.browser,
        loginMethod: activeSession.loginMethod,
        ip: activeSession.ip,
        ping: activeSession.ping,
        loginTime: activeSession.startTime,
        district: activeSession.district,
        city: activeSession.city
      });

      // Handle custom GPS position overrides from Geolocation API
      socket.on('update_gps_location', (data) => {
        const session = global.activeUserSessions.get(socket.id);
        if (session && data && data.latitude && data.longitude) {
          session.lat = data.latitude;
          session.lng = data.longitude;
          global.activeUserSessions.set(socket.id, session);

          io.emit('user_move', {
            id: session.userId.toString(),
            username: session.username,
            province: session.province,
            lat: session.lat,
            lng: session.lng,
            online: true,
            os: session.os,
            browser: session.browser,
            loginMethod: session.loginMethod,
            ip: session.ip,
            ping: session.ping,
            loginTime: session.startTime,
            district: session.district,
            city: session.city
          });
        }
      });

      // Handle ping latency updates
      socket.on('update_ping', (pingVal) => {
        const session = global.activeUserSessions.get(socket.id);
        if (session) {
          session.ping = parseInt(pingVal) || 0;
          global.activeUserSessions.set(socket.id, session);

          io.emit('user_move', {
            id: session.userId.toString(),
            username: session.username,
            province: session.province,
            lat: session.lat,
            lng: session.lng,
            online: true,
            os: session.os,
            browser: session.browser,
            loginMethod: session.loginMethod,
            ip: session.ip,
            ping: session.ping,
            loginTime: session.startTime,
            district: session.district,
            city: session.city
          });
        }
      });
    }
  }

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    if (global.activeUserSessions && global.activeUserSessions.has(socket.id)) {
      const session = global.activeUserSessions.get(socket.id);
      global.activeUserSessions.delete(socket.id);

      io.emit('user_offline', {
        id: session.userId.toString(),
        username: session.username,
      });
    }
  });
});

// ══════════════════════════════════════
// START SERVER
// ══════════════════════════════════════
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`OceanForge Server listening on port ${PORT}`);
  console.log(`Security layers active: Helmet, CORS whitelist, Rate Limiting, Sanitization, Socket JWT`);
});
