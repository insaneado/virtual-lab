/**
 * client/src/utils/deltaEncoder.js
 * ────────────────────────────────────────────────────────
 * Handles the delta compression logic on the client side.
 *
 * After every physics tick, we compare current body states
 * against the last-broadcast snapshot. Only bodies that
 * moved beyond the dead-zone threshold are included in
 * the delta packet. This cuts bandwidth by 70-90% vs
 * sending the full world every frame.
 *
 * The encoder maintains its own snapshot cache so it's
 * self-contained — just call encodeDelta(bodies) every
 * broadcast interval and it returns the minimal diff.
 * ────────────────────────────────────────────────────────
 */

// Dead-zone thresholds — ignore changes smaller than these
const POS_THRESHOLD   = 0.5;   // pixels
const ANGLE_THRESHOLD = 0.01;  // radians
const VEL_THRESHOLD   = 0.1;   // px/tick

// Rounding precision
const POS_PRECISION   = 1;
const ANGLE_PRECISION = 2;

const posFactor   = Math.pow(10, POS_PRECISION);
const angleFactor = Math.pow(10, ANGLE_PRECISION);

// Last-broadcast snapshot: Map<bodyId, { px, py, a, vx, vy, av }>
const lastSnapshot = new Map();

/**
 * Round a number to the given decimal precision.
 */
function round(value, factor) {
  return Math.round(value * factor) / factor;
}

/**
 * Compare current body states against the last snapshot
 * and return only the ones that changed meaningfully.
 *
 * @param {Matter.Body[]} bodies - All bodies in the world
 * @returns {{ id, px, py, a, vx, vy, av }[]} - Array of deltas
 */
export function encodeDelta(bodies) {
  const delta = [];

  for (const body of bodies) {
    // Skip static bodies — they don't move
    if (body.isStatic) continue;
    // Skip sleeping bodies — they haven't changed
    if (body.isSleeping) continue;

    const current = {
      px: round(body.position.x, posFactor),
      py: round(body.position.y, posFactor),
      a:  round(body.angle, angleFactor),
      vx: round(body.velocity.x, posFactor),
      vy: round(body.velocity.y, posFactor),
      av: round(body.angularVelocity, angleFactor),
    };

    const prev = lastSnapshot.get(body.id);

    // If we've never sent this body, include it
    if (!prev) {
      lastSnapshot.set(body.id, { ...current });
      delta.push({ id: body.id, ...current });
      continue;
    }

    // Check if any value exceeds the dead-zone
    const moved =
      Math.abs(current.px - prev.px) > POS_THRESHOLD ||
      Math.abs(current.py - prev.py) > POS_THRESHOLD ||
      Math.abs(current.a - prev.a) > ANGLE_THRESHOLD ||
      Math.abs(current.vx - prev.vx) > VEL_THRESHOLD ||
      Math.abs(current.vy - prev.vy) > VEL_THRESHOLD;

    if (moved) {
      lastSnapshot.set(body.id, { ...current });
      delta.push({ id: body.id, ...current });
    }
  }

  return delta;
}

/**
 * Apply incoming deltas to local Matter.js bodies.
 * Uses linear interpolation for smooth visual blending.
 *
 * @param {Matter.Body[]} localBodies - All bodies in the local world
 * @param {{ id, px, py, a, vx, vy, av }[]} deltas - Incoming remote deltas
 * @param {number} lerpFactor - Interpolation strength (0-1, default 0.3)
 */
export function applyDelta(localBodies, deltas, lerpFactor = 0.3) {
  // Build a lookup for fast matching
  const bodyMap = new Map();
  for (const body of localBodies) {
    bodyMap.set(body.id, body);
  }

  for (const d of deltas) {
    const body = bodyMap.get(d.id);
    if (!body || body.isStatic) continue;

    // Lerp position for smooth visual interpolation
    const newX = body.position.x + (d.px - body.position.x) * lerpFactor;
    const newY = body.position.y + (d.py - body.position.y) * lerpFactor;

    // Matter.Body.setPosition and setVelocity are the safe way to update
    // (they maintain internal caches correctly)
    const Matter = window.Matter || require('matter-js');
    Matter.Body.setPosition(body, { x: newX, y: newY });
    Matter.Body.setAngle(body, body.angle + (d.a - body.angle) * lerpFactor);
    Matter.Body.setVelocity(body, { x: d.vx, y: d.vy });
    Matter.Body.setAngularVelocity(body, d.av);
  }
}

/**
 * Clear the snapshot cache (call on room leave or reset).
 */
export function clearSnapshot() {
  lastSnapshot.clear();
}
