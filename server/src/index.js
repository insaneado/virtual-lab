const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config/env');
const { connectDB, closeDB } = require('./config/db');
const { attachAgentMiddleware } = require('./sockets/agentMiddleware');
const logger = require('./utils/logger');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.CLIENT_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  maxHttpBufferSize: 1e6,
});

attachAgentMiddleware(io);

async function start() {
  await connectDB();

  return new Promise((resolve) => {
    server.listen(config.PORT, () => {
      logger.info(
        { port: config.PORT, origins: config.CLIENT_ORIGINS },
        'VIRTUAL-LAB API listening',
      );
      resolve(server);
    });
  });
}

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Graceful shutdown started');

  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out');
    process.exit(1);
  }, 10_000);

  server.close(async (err) => {
    if (err) logger.error({ err }, 'HTTP server close failed');
    io.close();
    await closeDB();
    clearTimeout(forceExit);
    logger.info('Graceful shutdown complete');
    process.exit(err ? 1 : 0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

if (require.main === module) {
  start().catch((err) => {
    logger.error({ err, dbState: mongoose.connection.readyState }, 'Fatal startup error');
    process.exit(1);
  });
}

module.exports = {
  app,
  server,
  io,
  start,
  shutdown,
};
