import Matter from 'matter-js';
import {
  applyBodySnapshot,
  createBodyFromSnapshot,
  serializeBody,
  BODY_COLORS,
} from './bodyFactory.js';
import {
  createConstraintFromSnapshot,
  serializeConstraint,
} from './constraintFactory.js';

const { Body, World } = Matter;

export function getUserBodies(world) {
  return world.bodies.filter((body) => body.plugin?.virtualLab?.userBody);
}

export function getUserConstraints(world, motors = []) {
  return [
    ...world.constraints.filter((constraint) => constraint.plugin?.virtualLab),
    ...motors,
  ];
}

export function findBodyById(world, bodyId) {
  return getUserBodies(world).find((body) => body.label === bodyId);
}

export function findConstraintById(world, constraintId) {
  return world.constraints.find((constraint) => constraint.label === constraintId);
}

export function serializeWorld(world, motors = []) {
  return {
    gravity: { x: world.gravity.x, y: world.gravity.y },
    bodies: getUserBodies(world).map(serializeBody),
    constraints: getUserConstraints(world, motors).map(serializeConstraint),
  };
}

export function clearUserWorld(world) {
  World.remove(world, getUserBodies(world));
  World.remove(world, world.constraints.filter((constraint) => constraint.plugin?.virtualLab));
}

export function restoreWorld(engine, snapshot = {}, motorsRef) {
  const world = engine.world;
  clearUserWorld(world);
  if (motorsRef) motorsRef.current = new Map();

  const bodiesById = new Map();
  (snapshot.bodies || snapshot.bodySnapshot || []).forEach((bodySnapshot) => {
    const body = createBodyFromSnapshot(bodySnapshot);
    bodiesById.set(body.label, body);
    World.add(world, body);
  });

  (snapshot.constraints || snapshot.constraintSnapshot || []).forEach((constraintSnapshot) => {
    const constraint = createConstraintFromSnapshot(constraintSnapshot, bodiesById);
    if (!constraint) return;
    if (constraint.type === 'motor') {
      motorsRef?.current.set(constraint.bodyId, constraint.speed);
      return;
    }
    World.add(world, constraint);
  });

  return bodiesById;
}

export function applyRemoteBody(world, snapshot) {
  const existing = findBodyById(world, snapshot.id);
  if (existing) {
    applyBodySnapshot(existing, snapshot);
    return existing;
  }

  const body = createBodyFromSnapshot(snapshot);
  World.add(world, body);
  return body;
}

export function applyRemoteConstraint(world, snapshot, motorsRef) {
  if (snapshot.type === 'motor') {
    motorsRef?.current.set(snapshot.bodyId, snapshot.speed);
    return snapshot;
  }

  const existing = findConstraintById(world, snapshot.id);
  if (existing) World.remove(world, existing);

  const bodiesById = new Map(getUserBodies(world).map((body) => [body.label, body]));
  const constraint = createConstraintFromSnapshot(snapshot, bodiesById);
  if (constraint) World.add(world, constraint);
  return constraint;
}

export function updateBodyProperties(body, props = {}) {
  if (props.mass !== undefined && Number.isFinite(Number(props.mass))) {
    Body.setMass(body, Number(props.mass));
  }
  if (props.restitution !== undefined) body.restitution = Number(props.restitution);
  if (props.friction !== undefined) body.friction = Number(props.friction);
  if (props.isStatic !== undefined) Body.setStatic(body, Boolean(props.isStatic));
  if (props.fillStyle) body.render.fillStyle = props.fillStyle;
  if (props.label) body.plugin.virtualLab.displayLabel = props.label;
}

export function randomBodyColor() {
  return BODY_COLORS[Math.floor(Math.random() * BODY_COLORS.length)];
}
