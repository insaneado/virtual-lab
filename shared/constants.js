/**
 * shared/constants.js
 * ────────────────────────────────────────────────────────
 * Canonical event names, physics defaults, and sync config
 * shared between client and server. Import from here so
 * both sides stay in lockstep — a typo in an event name
 * is a silent failure, so we centralize them.
 * ────────────────────────────────────────────────────────
 */

// ─── Socket.io Event Names ──────────────────────────────

const ROOM_EVENTS = Object.freeze({
  CREATE:       'room:create',
  JOIN:         'room:join',
  LEAVE:        'room:leave',
  STATE:        'room:state',        // Full state snapshot on join
  USER_JOINED:  'room:user-joined',
  USER_LEFT:    'room:user-left',
  ERROR:        'room:error',
});

const SYNC_EVENTS = Object.freeze({
  DELTA:        'sync:delta',        // Incremental body updates
  FULL_STATE:   'sync:full-state',   // Full world dump (recovery)
  BODY_CLAIM:   'body:claim',        // Lock a body for editing
  BODY_RELEASE: 'body:release',      // Release the editing lock
  BODY_ADD:     'body:add',          // Structural: new body
  BODY_REMOVE:  'body:remove',       // Structural: remove body
  CONSTRAINT_ADD:    'constraint:add',
  CONSTRAINT_REMOVE: 'constraint:remove',
});

// ─── Physics Engine Defaults ────────────────────────────

const PHYSICS_DEFAULTS = Object.freeze({
  GRAVITY:          { x: 0, y: 1 },
  TIME_STEP:        1000 / 60,       // 16.67ms per tick (60 Hz)
  VELOCITY_ITERS:   6,
  POSITION_ITERS:   2,
  MAX_BODIES:       200,
  CANVAS_WIDTH:     1280,
  CANVAS_HEIGHT:    720,
});

// ─── Sync / Delta Configuration ─────────────────────────

const SYNC_CONFIG = Object.freeze({
  BROADCAST_RATE_MS:    50,          // 20 Hz delta emission
  POSITION_DEAD_ZONE:   0.5,        // px — ignore smaller movements
  ANGLE_DEAD_ZONE:      0.01,       // rad
  VELOCITY_DEAD_ZONE:   0.1,        // px/tick
  POSITION_PRECISION:   1,          // decimal places for rounding
  ANGLE_PRECISION:      2,
  LERP_FACTOR:          0.3,        // Interpolation smoothing on receiver
});

// ─── Room Limits ────────────────────────────────────────

const ROOM_CONFIG = Object.freeze({
  MAX_USERS:          8,
  CODE_LENGTH:        6,
  INACTIVITY_TIMEOUT: 30 * 60 * 1000,  // 30 min
});

module.exports = {
  ROOM_EVENTS,
  SYNC_EVENTS,
  PHYSICS_DEFAULTS,
  SYNC_CONFIG,
  ROOM_CONFIG,
};
