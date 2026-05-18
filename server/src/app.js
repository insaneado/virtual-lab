const compression = require('compression');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoose = require('mongoose');
const pinoHttp = require('pino-http');
const config = require('./config/env');
const authRoutes = require('./routes/auth');
const experimentRoutes = require('./routes/experiments');
const roomRoutes = require('./routes/rooms');
const logger = require('./utils/logger');
const { AppError, errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

function corsOrigin(origin, callback) {
  if (!origin || config.CLIENT_ORIGINS.includes('*') || config.CLIENT_ORIGINS.includes(origin)) {
    return callback(null, true);
  }

  return callback(new AppError(`Origin ${origin} is not allowed by CORS.`, 403));
}

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(
  pinoHttp({
    logger,
    autoLogging: config.isTest ? false : { ignore: (req) => req.url === '/health' },
  }),
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.isTest ? 10_000 : 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  }),
);

function healthPayload() {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const { readyState } = mongoose.connection;

  return {
    status: readyState === 1 ? 'ok' : 'degraded',
    uptime: process.uptime(),
    db: dbStates[readyState] || 'unknown',
  };
}

app.get('/health', (_req, res) => {
  const payload = healthPayload();
  res.status(payload.status === 'ok' ? 200 : 503).json(payload);
});

app.get('/api/health', (_req, res) => {
  const payload = healthPayload();
  res.status(payload.status === 'ok' ? 200 : 503).json(payload);
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/experiments', experimentRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
