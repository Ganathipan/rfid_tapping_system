const express = require('express');
const cors = require('cors');
const statsRoutes = require('./services/statsRoutes');
const analyticsRoutes = require('./services/analyticsRoutes');
const tagsRouter = require('./routes/tags');
const gameLiteRouter = require('./routes/gameLite');
const reader1ClusterKioskRouter = require('./routes/reader1ClusterKiosk');
const venueStateRouter = require('./routes/venueState');
const readerConfigRouter = require('./routes/readerConfig');
const exitoutRouter = require('./routes/exitoutRoutes');
const pool = require('./db/pool');

// Initialize MQTT handler
require('./realtime/mqttHandler');

const app = express();

// CORS: allow all origins in development, restrict in production
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '1mb' }));

// Health endpoint
app.get('/health', (_req, res) => res.json({ 
  ok: true, 
  ts: new Date().toISOString(),
  service: 'RFID Backend API'
}));

// Lightweight DB diagnostic endpoint (no side effects)
app.get('/api/debug/db', async (_req, res) => {
  try {
    const start = Date.now();
    const { rows } = await pool.query('SELECT NOW() as now');
    const ms = Date.now() - start;
    res.json({ ok: true, now: rows[0].now, latency_ms: ms });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, code: e.code });
  }
});

// API Routes
app.use('/api', statsRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', venueStateRouter);
app.use('/api', readerConfigRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/game-lite', gameLiteRouter);
app.use('/api', reader1ClusterKioskRouter);
app.use('/api/exitout', exitoutRouter);

// Root endpoint
app.get('/', (_req, res) => {
  res.send('✅ RFID Tracking API Running');
});

module.exports = app;