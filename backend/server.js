require('dotenv').config();
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

// ══════════════════════════════════════
// STATIC ASSETS
// ══════════════════════════════════════
const imagesPath = path.join(__dirname, '../ảnh');
app.use('/api/images', express.static(imagesPath));
console.log(`Static asset folder mapped: serving "/api/images" from "${imagesPath}"`);

// ══════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════
app.use('/api/auth', require('./routes/auth'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/lua', require('./routes/lua'));
app.use('/api/leviathan', require('./routes/leviathan'));

// ══════════════════════════════════════
// FALLBACK ERROR HANDLERS
// ══════════════════════════════════════
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Resource not found' });
});

// Global error handler — catches unhandled errors and logs them
app.use((err, req, res, next) => {
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
    origin: securityConfig.cors.allowedOrigins,
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

io.on('connection', (socket) => {
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

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
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
