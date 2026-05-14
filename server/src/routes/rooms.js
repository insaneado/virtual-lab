/**
 * server/src/routes/rooms.js
 * ────────────────────────────────────────────────────────
 * REST endpoints for room management.
 * These are supplementary to the Socket.io room handlers —
 * they let the client check room existence before
 * attempting a WebSocket join, and list active rooms.
 * ────────────────────────────────────────────────────────
 */

const express = require('express');
const router  = express.Router();
const { getActiveRooms } = require('../sockets/roomHandler');

// ─── CHECK IF A ROOM EXISTS ───────────────────────────
// GET /api/rooms/:code
router.get('/:code', (req, res) => {
  const code = (req.params.code || '').toUpperCase();
  const rooms = getActiveRooms();

  if (!rooms.has(code)) {
    return res.status(404).json({ exists: false, error: 'Room not found.' });
  }

  const room = rooms.get(code);

  res.json({
    exists: true,
    roomCode: code,
    host: room.host,
    participantCount: room.participants.length,
    maxUsers: room.maxUsers || 8,
  });
});

// ─── LIST ACTIVE ROOMS (for a lobby view) ─────────────
// GET /api/rooms
router.get('/', (req, res) => {
  const rooms = getActiveRooms();
  const list = [];

  for (const [code, room] of rooms) {
    list.push({
      roomCode: code,
      host: room.host,
      participantCount: room.participants.length,
      createdAt: room.createdAt,
    });
  }

  // Sort by most recently created
  list.sort((a, b) => b.createdAt - a.createdAt);

  res.json({ rooms: list, total: list.length });
});

module.exports = router;
