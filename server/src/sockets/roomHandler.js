/**
 * server/src/sockets/roomHandler.js
 * ────────────────────────────────────────────────────────
 * Manages the full lifecycle of collaborative rooms:
 *   room:create  → spin up a new room with a 6-char code
 *   room:join    → add a participant to an existing room
 *   room:leave   → graceful departure
 *   disconnect   → cleanup on unexpected drop
 *
 * The in-memory `activeRooms` map is the source of truth
 * for who's connected right now. MongoDB is written to
 * lazily — it's there for recovery, not for hot reads.
 * ────────────────────────────────────────────────────────
 */

const { ROOM_EVENTS, ROOM_CONFIG } = require('../../../shared/constants');
const conflictResolver = require('../services/conflictResolver');

// In-memory room registry: Map<roomCode, { host, participants[], worldState }>
const activeRooms = new Map();

/**
 * Generate a random alphanumeric room code.
 * Avoids ambiguous characters (0/O, 1/I/L) for readability.
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < ROOM_CONFIG.CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Collision check (extremely unlikely, but why not)
  return activeRooms.has(code) ? generateRoomCode() : code;
}

/**
 * Registers all room-related event handlers on a socket.
 * Called once per new connection from index.js.
 *
 * @param {SocketIO.Server} io    - The global io instance
 * @param {SocketIO.Socket} socket - The individual client socket
 */
function registerRoomHandlers(io, socket) {
  const username = socket.data.username;

  // ─── CREATE ROOM ────────────────────────────────────
  socket.on(ROOM_EVENTS.CREATE, (payload, callback) => {
    const roomCode = generateRoomCode();

    const room = {
      roomCode,
      host: username,
      participants: [
        { username, socketId: socket.id, role: 'host' },
      ],
      worldState: null,        // Will be populated by the first sync:full-state
      createdAt: Date.now(),
    };

    activeRooms.set(roomCode, room);
    conflictResolver.initRoom(roomCode);

    // Socket.io room join (for broadcasting)
    socket.join(roomCode);
    socket.data.roomCode = roomCode;

    console.log(`[Room] ${username} created room ${roomCode}`);

    // Acknowledge back to the creator
    if (typeof callback === 'function') {
      callback({ success: true, roomCode, participants: room.participants });
    }
  });

  // ─── JOIN ROOM ──────────────────────────────────────
  socket.on(ROOM_EVENTS.JOIN, (payload, callback) => {
    const { roomCode } = payload || {};

    if (!roomCode || !activeRooms.has(roomCode)) {
      const msg = `Room "${roomCode}" does not exist.`;
      console.warn(`[Room] Join failed: ${msg}`);
      if (typeof callback === 'function') {
        callback({ success: false, error: msg });
      }
      return;
    }

    const room = activeRooms.get(roomCode);

    // Capacity check
    if (room.participants.length >= ROOM_CONFIG.MAX_USERS) {
      const msg = `Room "${roomCode}" is full (${ROOM_CONFIG.MAX_USERS} users max).`;
      if (typeof callback === 'function') {
        callback({ success: false, error: msg });
      }
      return;
    }

    // Prevent duplicate joins
    const alreadyIn = room.participants.find(p => p.socketId === socket.id);
    if (!alreadyIn) {
      room.participants.push({ username, socketId: socket.id, role: 'editor' });
    }

    socket.join(roomCode);
    socket.data.roomCode = roomCode;

    console.log(`[Room] ${username} joined room ${roomCode} (${room.participants.length} users)`);

    // Notify everyone already in the room
    socket.to(roomCode).emit(ROOM_EVENTS.USER_JOINED, {
      username,
      participants: room.participants.map(p => ({ username: p.username, role: p.role })),
    });

    // Send the joiner the current world state (if any) + participant list
    if (typeof callback === 'function') {
      callback({
        success: true,
        roomCode,
        participants: room.participants.map(p => ({ username: p.username, role: p.role })),
        worldState: room.worldState,
      });
    }
  });

  // ─── LEAVE ROOM ─────────────────────────────────────
  socket.on(ROOM_EVENTS.LEAVE, () => {
    handleLeave(io, socket);
  });

  // ─── DISCONNECT ─────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[WS] ${username} disconnected (${reason})`);
    handleLeave(io, socket);
  });
}

/**
 * Shared leave/disconnect cleanup logic.
 * Removes the user from the in-memory room, releases any
 * body locks they were holding, and notifies remaining users.
 */
function handleLeave(io, socket) {
  const roomCode = socket.data.roomCode;
  if (!roomCode || !activeRooms.has(roomCode)) return;

  const room = activeRooms.get(roomCode);
  const username = socket.data.username;

  // Remove from participants
  room.participants = room.participants.filter(p => p.socketId !== socket.id);

  // Release any physics body locks this user was holding
  const releasedBodies = conflictResolver.releaseAll(roomCode, socket.id);
  if (releasedBodies.length > 0) {
    console.log(`[Room] Released ${releasedBodies.length} body locks from ${username}`);
  }

  socket.leave(roomCode);
  socket.data.roomCode = null;

  console.log(`[Room] ${username} left room ${roomCode} (${room.participants.length} remaining)`);

  // If room is empty, tear it down
  if (room.participants.length === 0) {
    activeRooms.delete(roomCode);
    conflictResolver.destroyRoom(roomCode);
    console.log(`[Room] Room ${roomCode} destroyed (empty)`);
    return;
  }

  // Notify remaining users
  io.to(roomCode).emit(ROOM_EVENTS.USER_LEFT, {
    username,
    participants: room.participants.map(p => ({ username: p.username, role: p.role })),
  });
}

/**
 * Expose the activeRooms map for the sync handler
 * (it needs to read/write worldState).
 */
function getActiveRooms() {
  return activeRooms;
}

module.exports = {
  registerRoomHandlers,
  getActiveRooms,
};
