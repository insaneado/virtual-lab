/**
 * server/src/index.js
 * ────────────────────────────────────────────────────────
 * Entry point — boots HTTP server, Socket.io, and MongoDB.
 * ────────────────────────────────────────────────────────
 */

const http   = require('http');
const { Server } = require('socket.io');
const app    = require('./app');
const config = require('./config/env');
const connectDB = require('./config/db');
const { authMiddleware } = require('./sockets/middleware');
const { registerRoomHandlers } = require('./sockets/roomHandler');
const { registerSyncHandlers } = require('./sockets/syncHandler');

const server = http.createServer(app);

// ─── Socket.io setup ──────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: config.CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  maxHttpBufferSize: 1e6,  // 1MB max per message
});

// Auth middleware — extracts username from handshake
io.use(authMiddleware);

// ─── Connection handler ───────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] Connected: ${socket.data.username} (${socket.id})`);

  // Register all event handlers on this socket
  registerRoomHandlers(io, socket);
  registerSyncHandlers(io, socket);
});

// ─── Boot sequence ────────────────────────────────────
async function start() {
  await connectDB();

  server.listen(config.PORT, () => {
    console.log(`[Server] Running on http://localhost:${config.PORT}`);
    console.log(`[Server] Accepting clients from ${config.CLIENT_ORIGIN}`);
  });
}

start().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
