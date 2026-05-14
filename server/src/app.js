/**
 * server/src/app.js
 * ────────────────────────────────────────────────────────
 * Express application factory.
 *
 * Sets up CORS, JSON parsing, route mounting, and basic
 * error handling. Exported as a plain Express app so that
 * index.js can wrap it with http.createServer for Socket.io.
 * ────────────────────────────────────────────────────────
 */

const express = require('express');
const cors    = require('cors');
const config  = require('./config/env');

// Route modules
const experimentRoutes = require('./routes/experiments');
const roomRoutes       = require('./routes/rooms');

const app = express();

// ─── Middleware ────────────────────────────────────────

app.use(cors({
  origin: config.CLIENT_ORIGIN,
  credentials: true,
}));

// Parse JSON bodies — cap at 5MB because experiment
// world state snapshots can get chunky with thumbnails
app.use(express.json({ limit: '5mb' }));

// ─── Routes ───────────────────────────────────────────

app.use('/api/experiments', experimentRoutes);
app.use('/api/rooms',       roomRoutes);

// Health check — useful for load balancers and monitoring
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

// ─── 404 catch-all ────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ─── Global error handler ─────────────────────────────

app.use((err, req, res, _next) => {
  console.error('[App] Unhandled error:', err.stack || err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;
