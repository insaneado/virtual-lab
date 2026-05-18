import Matter from 'matter-js';
import { nanoid } from 'nanoid';
import DOMPurify from 'dompurify';

const { Bodies, Body } = Matter;

const DEFAULT_RENDER = {
  fillStyle: '#22d3ee',
  strokeStyle: '#0e7490',
  lineWidth: 2,
};

function cleanLabel(value, fallback) {
  return DOMPurify.sanitize(String(value || fallback), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).slice(0, 80);
}

function stampBody(body, type, dimensions, options = {}) {
  const id = cleanLabel(options.id || options.label || nanoid(10), nanoid(10));
  body.label = id;
  body.plugin = {
    ...(body.plugin || {}),
    virtualLab: {
      id,
      type,
      dimensions,
      displayLabel: cleanLabel(options.displayLabel || options.name || type, type),
      userBody: options.userBody !== false,
    },
  };
  return body;
}

function mergeOptions(options = {}, render = {}) {
  return {
    restitution: 0.3,
    friction: 0.1,
    density: 0.001,
    ...options,
    render: {
      ...DEFAULT_RENDER,
      ...(options.render || {}),
      ...render,
    },
  };
}

/**
 * Create a rectangular Matter.js body with a sync-safe label id.
 *
 * @param {object} config Box creation config.
 * @returns {Matter.Body} Matter body.
 */
export function createBox(config = {}) {
  const {
    x = 320,
    y = 120,
    width = 80,
    height = 50,
    color = '#22d3ee',
    options = {},
  } = config;
  const body = Bodies.rectangle(x, y, width, height, mergeOptions(options, { fillStyle: color }));
  return stampBody(body, 'box', { width, height }, { ...config, ...options });
}

/**
 * Create a circular Matter.js body with a sync-safe label id.
 *
 * @param {object} config Circle creation config.
 * @returns {Matter.Body} Matter body.
 */
export function createCircle(config = {}) {
  const {
    x = 320,
    y = 120,
    radius = 28,
    color = '#6366f1',
    options = {},
  } = config;
  const body = Bodies.circle(x, y, radius, mergeOptions(options, { fillStyle: color }));
  return stampBody(body, 'circle', { radius }, { ...config, ...options });
}

/**
 * Create a polygon Matter.js body with a sync-safe label id.
 *
 * @param {object} config Polygon creation config.
 * @returns {Matter.Body} Matter body.
 */
export function createPolygon(config = {}) {
  const {
    x = 320,
    y = 120,
    sides = 3,
    radius = 35,
    color = '#f59e0b',
    options = {},
  } = config;
  const body = Bodies.polygon(x, y, sides, radius, mergeOptions(options, { fillStyle: color }));
  return stampBody(body, 'polygon', { sides, radius }, { ...config, ...options });
}

/**
 * Convert a body into the wire/storage snapshot used by the API and socket layer.
 *
 * @param {Matter.Body} body Live body.
 * @returns {object} Serializable body snapshot.
 */
export function serializeBody(body) {
  const meta = body.plugin?.virtualLab || {};
  return {
    id: meta.id || body.label,
    label: meta.displayLabel || meta.type || body.label,
    bodyType: meta.type || 'box',
    position: { x: body.position.x, y: body.position.y },
    velocity: { x: body.velocity.x, y: body.velocity.y },
    angle: body.angle,
    angularVelocity: body.angularVelocity,
    isStatic: body.isStatic,
    mass: body.mass,
    dimensions: meta.dimensions || {},
    material: {
      density: body.density,
      friction: body.friction,
      restitution: body.restitution,
    },
    render: {
      fillStyle: body.render.fillStyle,
      strokeStyle: body.render.strokeStyle,
      lineWidth: body.render.lineWidth,
    },
  };
}

/**
 * Restore a Matter.js body from a serialized snapshot.
 *
 * @param {object} snapshot Serialized body.
 * @returns {Matter.Body} Matter body.
 */
export function createBodyFromSnapshot(snapshot) {
  const common = {
    id: snapshot.id,
    label: snapshot.id,
    displayLabel: snapshot.label,
    options: {
      isStatic: snapshot.isStatic,
      density: snapshot.material?.density,
      friction: snapshot.material?.friction,
      restitution: snapshot.material?.restitution,
      angle: snapshot.angle || 0,
      render: snapshot.render || {},
    },
  };
  const type = snapshot.bodyType || 'box';
  const position = snapshot.position || { x: 320, y: 120 };
  let body;

  if (type === 'circle') {
    body = createCircle({
      ...common,
      x: position.x,
      y: position.y,
      radius: snapshot.dimensions?.radius || 28,
      color: snapshot.render?.fillStyle,
    });
  } else if (type === 'polygon') {
    body = createPolygon({
      ...common,
      x: position.x,
      y: position.y,
      sides: snapshot.dimensions?.sides || 3,
      radius: snapshot.dimensions?.radius || 35,
      color: snapshot.render?.fillStyle,
    });
  } else {
    body = createBox({
      ...common,
      x: position.x,
      y: position.y,
      width: snapshot.dimensions?.width || 80,
      height: snapshot.dimensions?.height || 50,
      color: snapshot.render?.fillStyle,
    });
  }

  if (snapshot.velocity) Body.setVelocity(body, snapshot.velocity);
  if (snapshot.angularVelocity) Body.setAngularVelocity(body, snapshot.angularVelocity);
  if (snapshot.angle) Body.setAngle(body, snapshot.angle);
  return body;
}

/**
 * Apply changing body state to an existing body without recreating it.
 *
 * @param {Matter.Body} body Existing body.
 * @param {object} snapshot Incoming body state.
 */
export function applyBodySnapshot(body, snapshot) {
  if (snapshot.position) Body.setPosition(body, snapshot.position);
  if (snapshot.velocity) Body.setVelocity(body, snapshot.velocity);
  if (snapshot.angle !== undefined) Body.setAngle(body, snapshot.angle);
  if (snapshot.angularVelocity !== undefined) Body.setAngularVelocity(body, snapshot.angularVelocity);
  if (snapshot.isStatic !== undefined) Body.setStatic(body, snapshot.isStatic);
  if (snapshot.material?.friction !== undefined) body.friction = snapshot.material.friction;
  if (snapshot.material?.restitution !== undefined) body.restitution = snapshot.material.restitution;
  if (snapshot.render?.fillStyle) body.render.fillStyle = snapshot.render.fillStyle;
  if (snapshot.label) {
    body.plugin.virtualLab.displayLabel = cleanLabel(snapshot.label, body.plugin.virtualLab.displayLabel);
  }
}

export const BODY_COLORS = [
  '#6366f1',
  '#22d3ee',
  '#10b981',
  '#f43f5e',
  '#f59e0b',
  '#14b8a6',
];
