require('express-async-errors');
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const { testConnection } = require('./config/db');
const routes             = require('./routes/index');
const { errorHandler, notFound } = require('./middleware/error');
const uploadRoutes = require('./routes/upload');

const app = express();

// ── SECURITY ──────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// ── RATE LIMITING ─────────────────────────────────────────────
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 30,
  message: { success: false, message: 'Too many requests, please try again later.' }
}));
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300
}));

// ── PARSING ───────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// ── LOGGING ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// ── STATIC FILES ──────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── HEALTH CHECK ──────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  success: true,
  message: 'LUXE API is running',
  env: process.env.NODE_ENV,
  timestamp: new Date().toISOString()
}));

// ── API ROUTES ────────────────────────────────────────────────
app.use('/api', routes);
app.use('/api/upload', uploadRoutes);

// ── SERVE REACT FRONTEND (production) ─────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// ── ERROR HANDLING ────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── START SERVER ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`\n🚀 LUXE Server running on port ${PORT}`);
    console.log(`📡 API:    http://localhost:${PORT}/api`);
    console.log(`🔍 Health: http://localhost:${PORT}/health`);
    console.log(`🌍 Env:    ${process.env.NODE_ENV}\n`);
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
