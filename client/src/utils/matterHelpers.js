/**
 * client/src/utils/matterHelpers.js
 * ────────────────────────────────────────────────────────
 * Serialization, deserialization, and helper functions
 * for Matter.js worlds.
 * ────────────────────────────────────────────────────────
 */

import Matter from 'matter-js';

const { Bodies, World, Body: MBody, Constraint } = Matter;

/**
 * Serialize ALL bodies (including static platforms) and constraints.
 */
export function serializeWorld(world) {
  // We keep ground/walls out (they're auto-created by the engine hook)
  const bodies = world.bodies
    .filter(b => b._bodyType) // only user-created bodies have _bodyType
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
      render:    c.render ? { strokeStyle: c.render.strokeStyle, lineWidth: c.render.lineWidth } : {},
    }));

  return {
    gravity: { x: world.gravity.x, y: world.gravity.y },
    bodies,
    constraints,
  };
}

/**
 * Restore a complete world state — bodies + constraints.
 * Handles all body types: circle, rectangle, triangle, platform.
 */
export function restoreWorld(engine, worldState) {
  if (!worldState) return;

  const world = engine.world;

  // Clear existing user-created bodies (keep ground/walls)
  const toRemove = world.bodies.filter(b => b._bodyType);
  World.remove(world, toRemove);
  // Clear existing constraints (keep mouse)
  const constraintsToRemove = world.constraints.filter(c => c.label !== 'Mouse Constraint');
  World.remove(world, constraintsToRemove);

  // Set gravity
  if (worldState.gravity) {
    world.gravity.x = worldState.gravity.x;
    world.gravity.y = worldState.gravity.y;
  }

  // id map: old serialized id -> new live body (for constraint wiring)
  const idMap = new Map();

  // Recreate bodies
  for (const bd of (worldState.bodies || [])) {
    let body;
    const renderOpts = bd.render || {};
    const matOpts = {
      isStatic:    bd.isStatic || false,
      render:      renderOpts,
      density:     bd.material?.density,
      friction:    bd.material?.friction,
      restitution: bd.material?.restitution,
    };

    switch (bd.bodyType) {
      case 'circle': {
        const r = bd.dimensions?.radius || 25;
        body = Bodies.circle(bd.position.x, bd.position.y, r, matOpts);
        body._dimensions = { radius: r };
        break;
      }
      case 'triangle': {
        const size = bd.dimensions?.size || 50;
        body = Bodies.polygon(bd.position.x, bd.position.y, 3, size / 1.5, matOpts);
        body._dimensions = { size };
        break;
      }
      case 'platform': {
        const w = bd.dimensions?.width || 200;
        const h = bd.dimensions?.height || 16;
        body = Bodies.rectangle(bd.position.x, bd.position.y, w, h, { ...matOpts, isStatic: true });
        body._dimensions = { width: w, height: h };
        break;
      }
      default: { // rectangle
        const w = bd.dimensions?.width || 50;
        const h = bd.dimensions?.height || 50;
        body = Bodies.rectangle(bd.position.x, bd.position.y, w, h, matOpts);
        body._dimensions = { width: w, height: h };
        break;
      }
    }

    body._bodyType = bd.bodyType;
    body.label = bd.label || `${bd.bodyType}_${body.id}`;

    if (bd.angle) MBody.setAngle(body, bd.angle);
    if (bd.velocity && !bd.isStatic) MBody.setVelocity(body, bd.velocity);
    if (bd.angularVelocity && !bd.isStatic) MBody.setAngularVelocity(body, bd.angularVelocity);

    idMap.set(bd.id, body);
    World.add(world, body);
  }

  // Recreate constraints
  for (const cd of (worldState.constraints || [])) {
    const bodyA = cd.bodyAId ? idMap.get(cd.bodyAId) : null;
    const bodyB = cd.bodyBId ? idMap.get(cd.bodyBId) : null;

    // skip if referenced bodies don't exist
    if (cd.bodyAId && !bodyA) continue;
    if (cd.bodyBId && !bodyB) continue;

    const cOpts = {
      stiffness: cd.stiffness ?? 1,
      damping:   cd.damping ?? 0,
      length:    cd.length ?? 0,
      render: { strokeStyle: cd.render?.strokeStyle || '#f59e0b', lineWidth: cd.render?.lineWidth || 2, visible: true },
    };

    // When bodyA is null, pointA is world-space (anchor point in space)
    // When bodyA exists, pointA is local offset from body center
    if (bodyA) { cOpts.bodyA = bodyA; cOpts.pointA = cd.pointA || { x: 0, y: 0 }; }
    else if (cd.pointA) { cOpts.pointA = cd.pointA; }

    if (bodyB) { cOpts.bodyB = bodyB; cOpts.pointB = cd.pointB || { x: 0, y: 0 }; }
    else if (cd.pointB) { cOpts.pointB = cd.pointB; }

    const constraint = Constraint.create(cOpts);

    constraint._constraintType = cd.type || 'pin';
    constraint.label = cd.label || `${cd.type}_${constraint.id}`;

    World.add(world, constraint);
  }

  return idMap;
}

/**
 * Pick a random vibrant color from our palette.
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
