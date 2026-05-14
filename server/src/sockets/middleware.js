/**
 * server/src/sockets/middleware.js
 * ────────────────────────────────────────────────────────
 * Socket.io middleware layer.
 *
 * Right now this handles:
 *  1. Extracting the username from the handshake query
 *  2. Basic rate-limiting per socket (events/second cap)
 *
 * When we add JWT auth later, the token validation will
 * slot in here without touching the handlers at all.
 * ────────────────────────────────────────────────────────
 */

/**
 * Authenticate incoming socket connections.
 * For the prototype, we just require a username in the query string.
 * e.g., io("http://localhost:4000", { query: { username: "alice" } })
 */
function authMiddleware(socket, next) {
  const username = socket.handshake.query.username;

  if (!username || typeof username !== 'string' || username.trim().length < 2) {
    return next(new Error('A valid username is required to connect.'));
  }

  // Attach to the socket instance so handlers can read it
  socket.data.username = username.trim();
  console.log(`[WS] Authenticated socket: ${socket.id} → ${socket.data.username}`);
  next();
}

/**
 * Simple sliding-window rate limiter.
 * Prevents a single client from flooding the server with events.
 * Allows `maxEvents` within a `windowMs` window per socket.
 */
function createRateLimiter(maxEvents = 120, windowMs = 1000) {
  const counters = new Map();

  return function rateLimitMiddleware(socket, next) {
    const key = socket.id;

    if (!counters.has(key)) {
      counters.set(key, { count: 0, resetAt: Date.now() + windowMs });
    }

    const entry = counters.get(key);
    const now = Date.now();

    // Reset window if expired
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }

    entry.count += 1;

    if (entry.count > maxEvents) {
      console.warn(`[WS] Rate limit hit for socket ${socket.id}`);
      return next(new Error('Rate limit exceeded. Slow down.'));
    }

    // Clean up on disconnect
    socket.on('disconnect', () => counters.delete(key));

    next();
  };
}

module.exports = {
  authMiddleware,
  createRateLimiter,
};
