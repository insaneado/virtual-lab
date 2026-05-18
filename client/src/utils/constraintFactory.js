import Matter from 'matter-js';
import { nanoid } from 'nanoid';

const { Bodies, Composite, Constraint } = Matter;

function constraintId(prefix) {
  return `${prefix}_${nanoid(10)}`;
}

function stampConstraint(constraint, type, options = {}) {
  const id = options.id || options.label || constraintId(type);
  constraint.label = id;
  constraint.plugin = {
    ...(constraint.plugin || {}),
    virtualLab: { id, type },
  };
  return constraint;
}

/**
 * Create a spring constraint between two bodies.
 *
 * @param {Matter.Body} bodyA First body.
 * @param {Matter.Body} bodyB Second body.
 * @param {object} options Matter constraint options.
 * @returns {Matter.Constraint} Matter constraint.
 */
export function createSpring(bodyA, bodyB, options = {}) {
  return stampConstraint(
    Constraint.create({
      bodyA,
      bodyB,
      length: options.length,
      stiffness: options.stiffness ?? 0.04,
      damping: options.damping ?? 0.02,
      render: {
        strokeStyle: '#10b981',
        lineWidth: 2,
        type: 'spring',
        ...(options.render || {}),
      },
    }),
    'spring',
    options
  );
}

/**
 * Create a pivot from a body to a world-space point.
 *
 * @param {Matter.Body} body Body to pin.
 * @param {object} point World-space point.
 * @param {object} options Matter constraint options.
 * @returns {Matter.Constraint} Matter constraint.
 */
export function createPivot(body, point, options = {}) {
  return stampConstraint(
    Constraint.create({
      pointA: point,
      bodyB: body,
      length: options.length ?? 0,
      stiffness: options.stiffness ?? 1,
      damping: options.damping ?? 0,
      render: {
        strokeStyle: '#f59e0b',
        lineWidth: 3,
        ...(options.render || {}),
      },
    }),
    'pivot',
    options
  );
}

/**
 * Create a rigid pivot-like joint between two bodies.
 *
 * @param {Matter.Body} bodyA First body.
 * @param {Matter.Body} bodyB Second body.
 * @param {object} options Matter constraint options.
 * @returns {Matter.Constraint} Matter constraint.
 */
export function createPivotConnection(bodyA, bodyB, options = {}) {
  return stampConstraint(
    Constraint.create({
      bodyA,
      bodyB,
      length: options.length ?? 0,
      stiffness: options.stiffness ?? 1,
      damping: options.damping ?? 0,
      render: {
        strokeStyle: '#f59e0b',
        lineWidth: 3,
        ...(options.render || {}),
      },
    }),
    'pivot',
    options
  );
}

/**
 * Create a flexible rope made from small segment bodies and constraints.
 *
 * @param {Matter.Body} bodyA First endpoint.
 * @param {Matter.Body} bodyB Second endpoint.
 * @param {object} options Rope options.
 * @returns {{composite: Matter.Composite, bodies: Matter.Body[], constraints: Matter.Constraint[]}}
 */
export function createRope(bodyA, bodyB, options = {}) {
  const segments = options.segments || 8;
  const radius = options.radius || 5;
  const composite = Composite.create({ label: options.id || constraintId('ropeComposite') });
  const bodies = [];
  const constraints = [];
  const start = bodyA.position;
  const end = bodyB.position;
  const stepX = (end.x - start.x) / (segments + 1);
  const stepY = (end.y - start.y) / (segments + 1);
  let previous = bodyA;

  for (let index = 0; index < segments; index += 1) {
    const segment = Bodies.circle(start.x + stepX * (index + 1), start.y + stepY * (index + 1), radius, {
      collisionFilter: { group: -1 },
      render: { fillStyle: '#94a3b8' },
      density: 0.0005,
    });
    segment.label = constraintId('ropeBody');
    segment.plugin = {
      virtualLab: {
        id: segment.label,
        type: 'circle',
        dimensions: { radius },
        ropeSegment: true,
        userBody: true,
      },
    };
    bodies.push(segment);
    Composite.add(composite, segment);

    const link = stampConstraint(
      Constraint.create({
        bodyA: previous,
        bodyB: segment,
        length: options.linkLength || Math.hypot(stepX, stepY),
        stiffness: options.stiffness ?? 0.8,
        damping: options.damping ?? 0.05,
        render: { strokeStyle: '#94a3b8', lineWidth: 2 },
      }),
      'rope',
      {}
    );
    constraints.push(link);
    Composite.add(composite, link);
    previous = segment;
  }

  const finalLink = stampConstraint(
    Constraint.create({
      bodyA: previous,
      bodyB,
      length: options.linkLength || Math.hypot(stepX, stepY),
      stiffness: options.stiffness ?? 0.8,
      damping: options.damping ?? 0.05,
      render: { strokeStyle: '#94a3b8', lineWidth: 2 },
    }),
    'rope',
    options
  );
  constraints.push(finalLink);
  Composite.add(composite, finalLink);
  return { composite, bodies, constraints };
}

/**
 * Create a motor descriptor. Matter.js receives angular velocity each tick.
 *
 * @param {Matter.Body} body Body to rotate.
 * @param {object} options Motor options.
 * @returns {object} Serializable motor descriptor.
 */
export function createMotor(body, options = {}) {
  return {
    id: options.id || constraintId('motor'),
    type: 'motor',
    bodyId: body.label,
    speed: options.speed ?? 0.08,
  };
}

/**
 * Serialize a Matter constraint or motor descriptor.
 *
 * @param {Matter.Constraint|object} constraint Constraint-like object.
 * @returns {object} Wire-safe snapshot.
 */
export function serializeConstraint(constraint) {
  if (constraint.type === 'motor') return constraint;
  const meta = constraint.plugin?.virtualLab || {};
  return {
    id: meta.id || constraint.label,
    label: constraint.label,
    type: meta.type || 'spring',
    bodyAId: constraint.bodyA?.label || null,
    bodyBId: constraint.bodyB?.label || null,
    pointA: constraint.pointA ? { x: constraint.pointA.x, y: constraint.pointA.y } : null,
    pointB: constraint.pointB ? { x: constraint.pointB.x, y: constraint.pointB.y } : null,
    stiffness: constraint.stiffness,
    damping: constraint.damping,
    length: constraint.length,
  };
}

/**
 * Restore a constraint snapshot against a body lookup map.
 *
 * @param {object} snapshot Constraint snapshot.
 * @param {Map<string, Matter.Body>} bodiesById Body lookup.
 * @returns {Matter.Constraint|object|null} Restored constraint.
 */
export function createConstraintFromSnapshot(snapshot, bodiesById) {
  if (!snapshot) return null;
  if (snapshot.type === 'motor') return snapshot;
  const bodyA = snapshot.bodyAId ? bodiesById.get(snapshot.bodyAId) : null;
  const bodyB = snapshot.bodyBId ? bodiesById.get(snapshot.bodyBId) : null;
  if (snapshot.bodyAId && !bodyA) return null;
  if (snapshot.bodyBId && !bodyB) return null;

  const constraint = Constraint.create({
    bodyA,
    bodyB,
    pointA: snapshot.pointA || undefined,
    pointB: snapshot.pointB || undefined,
    length: snapshot.length ?? 0,
    stiffness: snapshot.stiffness ?? 1,
    damping: snapshot.damping ?? 0,
    render: {
      strokeStyle: snapshot.type === 'spring' ? '#10b981' : '#f59e0b',
      lineWidth: snapshot.type === 'spring' ? 2 : 3,
    },
  });
  return stampConstraint(constraint, snapshot.type || 'pivot', {
    id: snapshot.id,
    label: snapshot.label,
  });
}
