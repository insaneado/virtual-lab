/**
 * client/src/services/socketClient.js
 * ────────────────────────────────────────────────────────
 * Socket.io client singleton.
 *
 * We lazy-initialize the connection so it only fires
 * when a component actually needs it (not on import).
 * The username is passed via the handshake query —
 * the server's auth middleware reads it from there.
 * ────────────────────────────────────────────────────────
 */

import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

let socketInstance = null;

/**
 * Get or create the socket connection.
 * Call this once when the user enters the app with a username.
 *
 * @param {string} username - Display name for this session
 * @returns {import('socket.io-client').Socket}
 */
export function getSocket(username) {
  if (socketInstance) return socketInstance;

  socketInstance = io(SERVER_URL, {
    query: { username },
    transports: ['websocket'],    // Skip long-polling, go straight to WS
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socketInstance.on('connect', () => {
    console.log(`[Socket] Connected as ${username} (${socketInstance.id})`);
  });

  socketInstance.on('disconnect', (reason) => {
    console.warn(`[Socket] Disconnected: ${reason}`);
  });

  socketInstance.on('connect_error', (err) => {
    console.error(`[Socket] Connection error: ${err.message}`);
  });

  return socketInstance;
}

/**
 * Disconnect and clear the singleton.
 * Call on logout or app teardown.
 */
export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

/**
 * Get the existing socket (or null if not connected).
 * Useful for components that just want to check status.
 */
export function peekSocket() {
  return socketInstance;
}
