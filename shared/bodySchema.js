/**
 * shared/bodySchema.js
 * ────────────────────────────────────────────────────────
 * Canonical serialization format for Matter.js bodies.
 * 
 * The physics engine stores a ton of internal state we
 * don't need on the wire. These helpers extract only the
 * fields we care about for sync and persistence, and can
 * rehydrate a plain object back into a Matter body.
 * ────────────────────────────────────────────────────────
 */

/**
 * Strips a Matter.js body down to its wire-safe representation.
 * This is what gets sent over Socket.io and stored in MongoDB.
 *
 * @param {Matter.Body} body - A live Matter.js body instance
 * @returns {Object} Serializable plain object
 */
function serializeBody(body) {
  return {
    id:              body.id,
    label:           body.label || `body_${body.id}`,
    bodyType:        body._bodyType || 'rectangle',  // Custom tag we set on creation
    position:        { x: body.position.x, y: body.position.y },
    angle:           body.angle,
    velocity:        { x: body.velocity.x, y: body.velocity.y },
    angularVelocity: body.angularVelocity,
    isStatic:        body.isStatic,
    isSleeping:      body.isSleeping,
    dimensions:      body._dimensions || {},          // { width, height } or { radius }
    render: {
      fillStyle:   body.render.fillStyle,
      strokeStyle: body.render.strokeStyle,
      lineWidth:   body.render.lineWidth,
    },
    material: {
      density:     body.density,
      friction:    body.friction,
      restitution: body.restitution,
    },
    collisionFilter: {
      group:    body.collisionFilter.group,
      category: body.collisionFilter.category,
      mask:     body.collisionFilter.mask,
    },
  };
}

/**
 * Strips a Matter.js constraint to its wire-safe form.
 *
 * @param {Matter.Constraint} constraint
 * @returns {Object}
 */
function serializeConstraint(constraint) {
  return {
    id:        constraint.id,
    label:     constraint.label,
    type:      constraint._constraintType || 'pin',
    bodyAId:   constraint.bodyA ? constraint.bodyA.id : null,
    bodyBId:   constraint.bodyB ? constraint.bodyB.id : null,
    pointA:    constraint.pointA ? { x: constraint.pointA.x, y: constraint.pointA.y } : null,
    pointB:    constraint.pointB ? { x: constraint.pointB.x, y: constraint.pointB.y } : null,
    stiffness: constraint.stiffness,
    damping:   constraint.damping,
    length:    constraint.length,
  };
}

/**
 * Produces a minimal delta-friendly snapshot of a body.
 * Only the fields that change every tick — positions, velocities, angle.
 * Everything else (dimensions, material, render) is static after creation.
 *
 * @param {Matter.Body} body
 * @param {number} posPrecision - Decimal places for position rounding
 * @param {number} anglePrecision - Decimal places for angle rounding
 * @returns {Object}
 */
function serializeBodyDelta(body, posPrecision = 1, anglePrecision = 2) {
  const pFactor = Math.pow(10, posPrecision);
  const aFactor = Math.pow(10, anglePrecision);

  return {
    id:  body.id,
    px:  Math.round(body.position.x * pFactor) / pFactor,
    py:  Math.round(body.position.y * pFactor) / pFactor,
    a:   Math.round(body.angle * aFactor) / aFactor,
    vx:  Math.round(body.velocity.x * pFactor) / pFactor,
    vy:  Math.round(body.velocity.y * pFactor) / pFactor,
    av:  Math.round(body.angularVelocity * aFactor) / aFactor,
  };
}

module.exports = {
  serializeBody,
  serializeConstraint,
  serializeBodyDelta,
};
