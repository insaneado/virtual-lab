/**
 * client/src/utils/matterHelpers.js
 * ────────────────────────────────────────────────────────
 * Utility functions for serializing and working with
 * Matter.js bodies. These are client-side convenience
 * wrappers around the shared bodySchema format.
 * ────────────────────────────────────────────────────────
 */

import Matter from 'matter-js';

/**
 * Serialize all non-static bodies in a world to a plain array.
 * Useful for saving experiments or doing a full-state broadcast.
 */
export function serializeWorld(world) {
  const bodies = world.bodies
    .filter(b => !b.isStatic)
    .map(b => ({
      id:              b.id,
      label:           b.label,
      bodyType:        b._bodyType || 'rectangle',
      position:        { x: b.position.x, y: b.position.y },
      angle:           b.angle,
      velocity:        { x: b.velocity.x, y: b.velocity.y },
      angularVelocity: b.angularVelocity,
      isStatic:        b.isStatic,
      dimensions:      b._dimensions || {},
      render: {
        fillStyle:   b.render.fillStyle,
        strokeStyle: b.render.strokeStyle,
        lineWidth:   b.render.lineWidth,
      },
      material: {
        density:     b.density,
        friction:    b.friction,
        restitution: b.restitution,
      },
    }));

  const constraints = world.constraints
    .filter(c => c.label !== 'Mouse Constraint')
    .map(c => ({
      id:        c.id,
      label:     c.label,
      type:      c._constraintType || 'pin',
      bodyAId:   c.bodyA ? c.bodyA.id : null,
      bodyBId:   c.bodyB ? c.bodyB.id : null,
      pointA:    c.pointA ? { x: c.pointA.x, y: c.pointA.y } : null,
      pointB:    c.pointB ? { x: c.pointB.x, y: c.pointB.y } : null,
      stiffness: c.stiffness,
      damping:   c.damping,
      length:    c.length,
    }));

  return {
    gravity: {
      x: world.gravity.x,
      y: world.gravity.y,
    },
    bodies,
    constraints,
  };
}

/**
 * Restore bodies from a serialized world state into a live engine.
 * Clears all existing non-static bodies first.
 */
export function restoreWorld(engine, worldState) {
  if (!worldState) return;

  const { Bodies, World, Body: MBody } = Matter;
  const world = engine.world;

  // Clear existing dynamic bodies
  const toRemove = world.bodies.filter(b => !b.isStatic);
  World.remove(world, toRemove);

  // Set gravity
  if (worldState.gravity) {
    world.gravity.x = worldState.gravity.x;
    world.gravity.y = worldState.gravity.y;
  }

  // Recreate bodies
  for (const bd of (worldState.bodies || [])) {
    let body;

    if (bd.bodyType === 'circle') {
      const r = bd.dimensions?.radius || 25;
      body = Bodies.circle(bd.position.x, bd.position.y, r, {
        isStatic: bd.isStatic || false,
        render: bd.render || {},
        density: bd.material?.density,
        friction: bd.material?.friction,
        restitution: bd.material?.restitution,
      });
      body._dimensions = { radius: r };
    } else {
      const w = bd.dimensions?.width || 50;
      const h = bd.dimensions?.height || 50;
      body = Bodies.rectangle(bd.position.x, bd.position.y, w, h, {
        isStatic: bd.isStatic || false,
        render: bd.render || {},
        density: bd.material?.density,
        friction: bd.material?.friction,
        restitution: bd.material?.restitution,
      });
      body._dimensions = { width: w, height: h };
    }

    body._bodyType = bd.bodyType;
    body.label = bd.label || `body_${body.id}`;

    if (bd.angle) MBody.setAngle(body, bd.angle);
    if (bd.velocity) MBody.setVelocity(body, bd.velocity);
    if (bd.angularVelocity) MBody.setAngularVelocity(body, bd.angularVelocity);

    World.add(world, body);
  }
}

/**
 * Pick a random vibrant color from our palette.
 * Used when spawning new bodies to keep things visually varied.
 */
const BODY_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7',  // Purples
  '#22d3ee', '#06b6d4', '#0ea5e9',  // Cyans
  '#10b981', '#34d399', '#14b8a6',  // Greens
  '#f43f5e', '#fb7185', '#e11d48',  // Reds
  '#f59e0b', '#fbbf24', '#d97706',  // Ambers
];

export function randomBodyColor() {
  return BODY_COLORS[Math.floor(Math.random() * BODY_COLORS.length)];
}
