const jwt = require('jsonwebtoken');
const Room = require('../models/Room');
const Experiment = require('../models/Experiment');
const User = require('../models/User');
const config = require('../config/env');
const logger = require('../utils/logger');
const { sanitizeString, sanitizeStringArray } = require('../utils/sanitize');

const BROADCAST_INTERVAL_MS = 1000 / 30;
const CONFLICT_WINDOW_MS = 50;
const BODY_UPDATE_LIMIT_PER_SECOND = 100;
const rooms = new Map();

function parseCookies(header = '') {
  return header.split(';').reduce((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rawValue.join('='));
    return acc;
  }, {});
}

function getSocketToken(socket) {
  if (socket.handshake.auth?.token) return socket.handshake.auth.token;
  const cookies = parseCookies(socket.handshake.headers.cookie || '');
  return cookies[config.AUTH_COOKIE_NAME] || null;
}

async function authenticateSocket(socket, next) {
  try {
    const token = getSocketToken(socket);
    if (!token) throw new Error('Authentication required.');

    const payload = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) throw new Error('Authenticated user no longer exists.');

    socket.data.userId = user.id;
    socket.data.username = user.username;
    next();
  } catch (err) {
    next(err);
  }
}

function makeEmptyRoom(roomId) {
  return {
    roomId,
    bodies: new Map(),
    constraints: new Map(),
    users: new Map(),
    cursors: new Map(),
    lastBodyWrites: new Map(),
    pendingBodies: new Set(),
    pendingConstraints: new Set(),
    pendingBodyRemovals: new Set(),
    pendingConstraintRemovals: new Set(),
    clientSnapshots: new Map(),
    persistTimer: null,
    interval: null,
  };
}

function normalizeId(value) {
  return String(value || '').trim();
}

function serializeRoom(room) {
  return {
    roomId: room.roomId,
    bodies: Array.from(room.bodies.values()),
    constraints: Array.from(room.constraints.values()),
    users: Array.from(room.users.values()),
  };
}

function shallowDiffers(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b);
}

function markBodyChanged(room, id) {
  room.pendingBodies.add(id);
}

function markConstraintChanged(room, id) {
  room.pendingConstraints.add(id);
}

function schedulePersist(room) {
  if (room.persistTimer) return;

  room.persistTimer = setTimeout(async () => {
    room.persistTimer = null;
    try {
      await Room.findOneAndUpdate(
        { roomId: room.roomId },
        {
          $set: {
            bodies: Array.from(room.bodies.values()),
            constraints: Array.from(room.constraints.values()),
            lastUpdatedAt: new Date(),
          },
        },
      );
    } catch (err) {
      logger.error({ err, roomId: room.roomId }, 'Failed to persist room state');
    }
  }, 1000);
}

async function getOrCreateRoomState(roomId) {
  const normalizedRoomId = normalizeId(roomId).toUpperCase();
  if (rooms.has(normalizedRoomId)) return rooms.get(normalizedRoomId);

  const room = makeEmptyRoom(normalizedRoomId);
  const dbRoom = await Room.findOne({
    $or: [{ roomId: normalizedRoomId }, { joinCode: normalizedRoomId }],
    isActive: true,
  });

  if (!dbRoom) return null;

  room.roomId = dbRoom.roomId;
  dbRoom.bodies.forEach((body) => room.bodies.set(normalizeId(body.id || body.label), body));
  dbRoom.constraints.forEach((constraint) => {
    room.constraints.set(normalizeId(constraint.id || constraint.label), constraint);
  });
  rooms.set(dbRoom.roomId, room);
  return room;
}

function initializeClientSnapshot(room, socketId) {
  room.clientSnapshots.set(socketId, {
    bodies: new Map(),
    constraints: new Map(),
  });
}

function startBroadcastLoop(io, room) {
  if (room.interval) return;

  room.interval = setInterval(() => {
    if (room.users.size === 0) return;

    for (const socketId of room.users.keys()) {
      const clientSnapshot = room.clientSnapshots.get(socketId);
      const socket = io.sockets.sockets.get(socketId);
      if (!clientSnapshot || !socket) continue;

      const bodies = [];
      const constraints = [];
      const removedBodies = Array.from(room.pendingBodyRemovals);
      const removedConstraints = Array.from(room.pendingConstraintRemovals);

      room.pendingBodies.forEach((bodyId) => {
        const current = room.bodies.get(bodyId);
        if (!current) return;
        const previous = clientSnapshot.bodies.get(bodyId);
        if (!previous || shallowDiffers(previous, current)) {
          bodies.push(current);
          clientSnapshot.bodies.set(bodyId, current);
        }
      });

      room.pendingConstraints.forEach((constraintId) => {
        const current = room.constraints.get(constraintId);
        if (!current) return;
        const previous = clientSnapshot.constraints.get(constraintId);
        if (!previous || shallowDiffers(previous, current)) {
          constraints.push(current);
          clientSnapshot.constraints.set(constraintId, current);
        }
      });

      removedBodies.forEach((bodyId) => clientSnapshot.bodies.delete(bodyId));
      removedConstraints.forEach((constraintId) => clientSnapshot.constraints.delete(constraintId));

      if (bodies.length || constraints.length || removedBodies.length || removedConstraints.length) {
        socket.volatile.emit('world:delta', {
          roomId: room.roomId,
          bodies,
          constraints,
          removedBodies,
          removedConstraints,
          timestamp: Date.now(),
        });
      }
    }

    room.pendingBodies.clear();
    room.pendingConstraints.clear();
    room.pendingBodyRemovals.clear();
    room.pendingConstraintRemovals.clear();
  }, BROADCAST_INTERVAL_MS);
}

function stopBroadcastLoop(room) {
  if (room.interval) clearInterval(room.interval);
  if (room.persistTimer) clearTimeout(room.persistTimer);
  room.interval = null;
  room.persistTimer = null;
}

function checkBodyUpdateRate(socket) {
  const now = Date.now();
  const bucket = socket.data.bodyUpdateBucket || { count: 0, resetAt: now + 1000 };

  if (now >= bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + 1000;
  }

  bucket.count += 1;
  socket.data.bodyUpdateBucket = bucket;

  if (bucket.count > BODY_UPDATE_LIMIT_PER_SECOND) {
    socket.emit('rate-limit', { event: 'body:update', limit: BODY_UPDATE_LIMIT_PER_SECOND });
    logger.warn({ socketId: socket.id, userId: socket.data.userId }, 'Socket kicked for body:update flood');
    socket.disconnect(true);
    return false;
  }

  return true;
}

function shouldAcceptBodyWrite(room, bodyId, timestamp) {
  const incoming = Number(timestamp) || Date.now();
  const previous = room.lastBodyWrites.get(bodyId);

  if (previous && Math.abs(incoming - previous.timestamp) <= CONFLICT_WINDOW_MS) {
    if (incoming < previous.timestamp) return false;
  }

  room.lastBodyWrites.set(bodyId, { timestamp: incoming });
  return true;
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  const id = normalizeId(body.id || body.label);
  if (!id) return null;

  return {
    ...body,
    id,
    label: sanitizeString(body.label || id, 80),
  };
}

function sanitizeConstraint(constraint) {
  if (!constraint || typeof constraint !== 'object') return null;
  const id = normalizeId(constraint.id || constraint.label);
  if (!id) return null;

  return {
    ...constraint,
    id,
    label: sanitizeString(constraint.label || id, 80),
  };
}

function registerAgentHandlers(io, socket) {
  socket.on('join-room', async (payload = {}, ack) => {
    try {
      const room = await getOrCreateRoomState(payload.roomId || payload.joinCode);
      if (!room) {
        ack?.({ success: false, error: 'Room not found.' });
        return;
      }

      if (socket.data.roomId && socket.data.roomId !== room.roomId) {
        socket.leave(socket.data.roomId);
      }

      socket.join(room.roomId);
      socket.data.roomId = room.roomId;
      room.users.set(socket.id, {
        userId: socket.data.userId,
        username: socket.data.username,
        socketId: socket.id,
      });
      initializeClientSnapshot(room, socket.id);
      startBroadcastLoop(io, room);

      const snapshot = serializeRoom(room);
      socket.emit('world:snapshot', snapshot);
      ack?.({ success: true, snapshot });
      socket.to(room.roomId).emit('user:joined', {
        userId: socket.data.userId,
        username: socket.data.username,
      });
    } catch (err) {
      logger.error({ err }, 'join-room failed');
      ack?.({ success: false, error: 'Could not join room.' });
    }
  });

  socket.on('body:add', (payload = {}, ack) => {
    const room = rooms.get(socket.data.roomId);
    const body = sanitizeBody(payload.body || payload);
    if (!room || !body) {
      ack?.({ success: false, error: 'Invalid body payload.' });
      return;
    }

    room.bodies.set(body.id, { ...body, updatedAt: Number(payload.timestamp) || Date.now() });
    markBodyChanged(room, body.id);
    schedulePersist(room);
    ack?.({ success: true, body });
  });

  socket.on('body:remove', (payload = {}, ack) => {
    const room = rooms.get(socket.data.roomId);
    const bodyId = normalizeId(payload.bodyId);
    if (!room || !bodyId) {
      ack?.({ success: false, error: 'Invalid bodyId.' });
      return;
    }

    room.bodies.delete(bodyId);
    room.pendingBodyRemovals.add(bodyId);
    schedulePersist(room);
    ack?.({ success: true });
  });

  socket.on('body:update', (payload = {}, ack) => {
    if (!checkBodyUpdateRate(socket)) return;

    const room = rooms.get(socket.data.roomId);
    const bodyId = normalizeId(payload.bodyId);
    if (!room || !bodyId) {
      ack?.({ success: false, error: 'Invalid body update.' });
      return;
    }

    if (!shouldAcceptBodyWrite(room, bodyId, payload.timestamp)) {
      ack?.({ success: false, conflict: true });
      return;
    }

    const existing = room.bodies.get(bodyId) || { id: bodyId, label: bodyId };
    const incomingBody = sanitizeBody(payload.body);
    const next = {
      ...existing,
      ...(incomingBody || {}),
      position: payload.position || existing.position,
      velocity: payload.velocity || existing.velocity,
      angle: payload.angle ?? existing.angle,
      angularVelocity: payload.angularVelocity ?? existing.angularVelocity,
      updatedAt: Number(payload.timestamp) || Date.now(),
    };

    room.bodies.set(bodyId, next);
    markBodyChanged(room, bodyId);
    schedulePersist(room);
    ack?.({ success: true });
  });

  socket.on('constraint:add', (payload = {}, ack) => {
    const room = rooms.get(socket.data.roomId);
    const constraint = sanitizeConstraint(payload.constraint || payload);
    if (!room || !constraint) {
      ack?.({ success: false, error: 'Invalid constraint payload.' });
      return;
    }

    room.constraints.set(constraint.id, { ...constraint, updatedAt: Number(payload.timestamp) || Date.now() });
    markConstraintChanged(room, constraint.id);
    schedulePersist(room);
    ack?.({ success: true, constraint });
  });

  socket.on('constraint:remove', (payload = {}, ack) => {
    const room = rooms.get(socket.data.roomId);
    const constraintId = normalizeId(payload.constraintId);
    if (!room || !constraintId) {
      ack?.({ success: false, error: 'Invalid constraintId.' });
      return;
    }

    room.constraints.delete(constraintId);
    room.pendingConstraintRemovals.add(constraintId);
    schedulePersist(room);
    ack?.({ success: true });
  });

  socket.on('cursor:move', (payload = {}) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return;

    const cursor = {
      userId: socket.data.userId,
      username: socket.data.username,
      x: Number(payload.x) || 0,
      y: Number(payload.y) || 0,
    };

    room.cursors.set(socket.data.userId, cursor);
    socket.to(room.roomId).volatile.emit('cursor:move', cursor);
  });

  socket.on('experiment:save', async (payload = {}, ack) => {
    try {
      const room = rooms.get(socket.data.roomId);
      const bodySnapshot = payload.bodySnapshot || (room ? Array.from(room.bodies.values()) : []);
      const constraintSnapshot = payload.constraintSnapshot || (room ? Array.from(room.constraints.values()) : []);

      const experiment = await Experiment.create({
        title: sanitizeString(payload.title, 120),
        description: sanitizeString(payload.description || '', 2000),
        thumbnail: payload.thumbnail || '',
        tags: sanitizeStringArray(payload.tags || []),
        authorId: socket.data.userId,
        bodySnapshot,
        constraintSnapshot,
        isPublic: payload.isPublic !== false,
      });

      ack?.({ success: true, experiment: experiment.toJSON() });
    } catch (err) {
      logger.error({ err }, 'experiment:save failed');
      ack?.({ success: false, error: 'Experiment could not be saved.' });
    }
  });

  socket.on('disconnect', () => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return;

    room.users.delete(socket.id);
    room.clientSnapshots.delete(socket.id);
    room.cursors.delete(socket.data.userId);
    socket.to(room.roomId).emit('user:left', {
      userId: socket.data.userId,
      username: socket.data.username,
    });

    if (room.users.size === 0) {
      stopBroadcastLoop(room);
      rooms.delete(room.roomId);
    }
  });
}

function attachAgentMiddleware(io) {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id, userId: socket.data.userId }, 'Socket connected');
    registerAgentHandlers(io, socket);
  });
}

module.exports = {
  attachAgentMiddleware,
  rooms,
};
