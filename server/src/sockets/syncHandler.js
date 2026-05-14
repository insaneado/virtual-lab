/**
 * server/src/sockets/syncHandler.js
 * ────────────────────────────────────────────────────────
 * The Agent Middleware — physics state synchronization.
 *
 * This is the hot path. Every 50ms, each client with
 * active physics sends a delta packet describing which
 * bodies moved. The server:
 *   1. Validates the sender is in a room
 *   2. Checks ownership locks (don't relay edits to
 *      bodies someone else is dragging)
 *   3. Broadcasts the delta to all OTHER clients in the
 *      room (sender excluded — they already have the state)
 *   4. Caches the latest full state so new joiners can
 *      catch up instantly
 *
 * Structural changes (add/remove bodies or constraints)
 * go through dedicated events and are always relayed to
 * ALL clients including the sender (for confirmation).
 * ────────────────────────────────────────────────────────
 */

const { SYNC_EVENTS } = require('../../../shared/constants');
const { getActiveRooms } = require('./roomHandler');
const conflictResolver = require('../services/conflictResolver');

/**
 * Registers sync-related event handlers on a socket.
 *
 * @param {SocketIO.Server} io
 * @param {SocketIO.Socket} socket
 */
function registerSyncHandlers(io, socket) {

  // ─── DELTA BROADCAST ────────────────────────────────
  // High-frequency event. Payload: { bodies: [ { id, px, py, a, vx, vy, av }, ... ] }
  socket.on(SYNC_EVENTS.DELTA, (delta) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;  // Not in a room — ignore silently

    // Filter out bodies that are locked by another user.
    // This prevents a stale delta from overwriting someone's drag.
    if (delta.bodies && Array.isArray(delta.bodies)) {
      delta.bodies = delta.bodies.filter(b => {
        const owner = conflictResolver.getOwner(roomCode, b.id);
        // Allow if: no owner, or the sender IS the owner
        return !owner || owner.socketId === socket.id;
      });
    }

    // Relay to everyone else in the room
    socket.to(roomCode).volatile.emit(SYNC_EVENTS.DELTA, {
      bodies: delta.bodies,
      sender: socket.data.username,
      timestamp: Date.now(),
    });
  });

  // ─── FULL STATE SYNC ────────────────────────────────
  // Sent when a new user joins and needs the complete world,
  // or when the host pushes a full reset.
  socket.on(SYNC_EVENTS.FULL_STATE, (worldState) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    const rooms = getActiveRooms();
    const room = rooms.get(roomCode);
    if (!room) return;

    // Cache the latest full state on the room object
    room.worldState = worldState;

    // Broadcast to everyone else
    socket.to(roomCode).emit(SYNC_EVENTS.FULL_STATE, {
      worldState,
      sender: socket.data.username,
    });
  });

  // ─── BODY CLAIM (lock for dragging) ─────────────────
  socket.on(SYNC_EVENTS.BODY_CLAIM, ({ bodyId }, callback) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    const success = conflictResolver.claim(
      roomCode, bodyId, socket.id, socket.data.username
    );

    // Notify everyone about the lock state change
    if (success) {
      io.to(roomCode).emit(SYNC_EVENTS.BODY_CLAIM, {
        bodyId,
        owner: socket.data.username,
      });
    }

    if (typeof callback === 'function') {
      callback({ success });
    }
  });

  // ─── BODY RELEASE ───────────────────────────────────
  socket.on(SYNC_EVENTS.BODY_RELEASE, ({ bodyId }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    conflictResolver.release(roomCode, bodyId, socket.id);

    io.to(roomCode).emit(SYNC_EVENTS.BODY_RELEASE, {
      bodyId,
      releasedBy: socket.data.username,
    });
  });

  // ─── STRUCTURAL: ADD BODY ───────────────────────────
  // Payload: full serialized body object (from bodySchema.serializeBody)
  socket.on(SYNC_EVENTS.BODY_ADD, (bodyData) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    // Broadcast to ALL clients (including sender for ID confirmation)
    io.to(roomCode).emit(SYNC_EVENTS.BODY_ADD, {
      body: bodyData,
      addedBy: socket.data.username,
    });
  });

  // ─── STRUCTURAL: REMOVE BODY ───────────────────────
  socket.on(SYNC_EVENTS.BODY_REMOVE, ({ bodyId }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    // Clear any lock on the removed body
    conflictResolver.release(roomCode, bodyId, socket.id);

    io.to(roomCode).emit(SYNC_EVENTS.BODY_REMOVE, {
      bodyId,
      removedBy: socket.data.username,
    });
  });

  // ─── STRUCTURAL: ADD CONSTRAINT ─────────────────────
  socket.on(SYNC_EVENTS.CONSTRAINT_ADD, (constraintData) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    io.to(roomCode).emit(SYNC_EVENTS.CONSTRAINT_ADD, {
      constraint: constraintData,
      addedBy: socket.data.username,
    });
  });

  // ─── STRUCTURAL: REMOVE CONSTRAINT ──────────────────
  socket.on(SYNC_EVENTS.CONSTRAINT_REMOVE, ({ constraintId }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    io.to(roomCode).emit(SYNC_EVENTS.CONSTRAINT_REMOVE, {
      constraintId,
      removedBy: socket.data.username,
    });
  });
}

module.exports = { registerSyncHandlers };
