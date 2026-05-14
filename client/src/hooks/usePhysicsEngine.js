/**
 * client/src/hooks/usePhysicsEngine.js
 * ────────────────────────────────────────────────────────
 * Custom hook that owns the entire Matter.js lifecycle.
 *
 * Returns refs to the engine, world, and render, plus
 * control functions (pause, resume, reset, addBody,
 * addConstraint, updateBody, removeConstraint).
 *
 * The engine runs on requestAnimationFrame — we never use
 * Matter.Runner because it doesn't give us frame-budget
 * control and will fight with React's update cycle.
 *
 * Motors are simulated per-tick by checking bodies tagged
 * with _motorSpeed and injecting angular velocity.
 * ────────────────────────────────────────────────────────
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import Matter from 'matter-js';

const {
  Engine, Render, World, Mouse,
  MouseConstraint, Bodies, Events, Body,
  Constraint, Query, Composite,
} = Matter;

// preset config per constraint type
const CONSTRAINT_PRESETS = {
  pin:    { stiffness: 1,    damping: 0,    length: 0   },
  spring: { stiffness: 0.04, damping: 0.01, length: null },
  rope:   { stiffness: 0.8,  damping: 0.05, length: null },
};

const CONSTRAINT_STYLES = {
  pin:    { strokeStyle: '#f59e0b', lineWidth: 3 },
  spring: { strokeStyle: '#10b981', lineWidth: 2, type: 'spring' },
  rope:   { strokeStyle: '#94a3b8', lineWidth: 2, lineDash: '6 4' },
};

export default function usePhysicsEngine(canvasContainerRef, options = {}) {
  const {
    width = 1280,
    height = 720,
    gravity = { x: 0, y: 1 },
    wireframes = false,
    background = 'transparent',
  } = options;

  // Refs survive re-renders without causing them
  const engineRef  = useRef(null);
  const renderRef  = useRef(null);
  const rafIdRef   = useRef(null);
  const runningRef = useRef(false);
  const motorsRef  = useRef(new Map()); // bodyId -> speed

  const [isRunning, setIsRunning] = useState(false);

  // ─── Initialize engine + renderer ──────────────────
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const engine = Engine.create({
      gravity: { x: gravity.x, y: gravity.y, scale: 0.001 },
      positionIterations: 6,
      velocityIterations: 4,
    });

    const render = Render.create({
      element: container,
      engine: engine,
      options: {
        width,
        height,
        pixelRatio: window.devicePixelRatio || 1,
        wireframes,
        background,
        wireframeBackground: 'transparent',
        showVelocity: false,
        showAngleIndicator: false,
      },
    });

    // Mouse interaction for dragging bodies
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.2,
        render: {
          visible: true,
          lineWidth: 1,
          strokeStyle: 'rgba(99, 102, 241, 0.5)',
        },
      },
    });

    World.add(engine.world, mouseConstraint);
    render.mouse = mouse;

    engineRef.current = engine;
    renderRef.current = render;

    // ground and walls
    const wallOpts = {
      isStatic: true,
      render: {
        fillStyle: '#1e293b',
        strokeStyle: '#334155',
        lineWidth: 2,
      },
    };

    const ground    = Bodies.rectangle(width / 2, height + 25, width + 100, 50, wallOpts);
    const leftWall  = Bodies.rectangle(-25, height / 2, 50, height, wallOpts);
    const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height, wallOpts);

    World.add(engine.world, [ground, leftWall, rightWall]);
    Render.run(render);
    startLoop(engine);

    return () => {
      stopLoop();
      Render.stop(render);
      World.clear(engine.world);
      Engine.clear(engine);
      render.canvas.remove();
      render.textures = {};
      engineRef.current = null;
      renderRef.current = null;
      motorsRef.current.clear();
    };
  }, []);

  // ─── Fixed-timestep physics loop ───────────────────
  const startLoop = useCallback((engine) => {
    const dt = 1000 / 60;
    runningRef.current = true;
    setIsRunning(true);

    function tick() {
      if (!runningRef.current) return;

      // --- Motor tick: inject angular velocity on tagged bodies ---
      motorsRef.current.forEach((speed, bodyId) => {
        const bodies = engine.world.bodies;
        const b = bodies.find(x => x.id === bodyId);
        if (b && !b.isStatic) {
          Body.setAngularVelocity(b, speed);
        }
      });

      Engine.update(engine, dt);
      rafIdRef.current = requestAnimationFrame(tick);
    }

    rafIdRef.current = requestAnimationFrame(tick);
  }, []);

  const stopLoop = useCallback(() => {
    runningRef.current = false;
    setIsRunning(false);
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  // ─── Public control methods ────────────────────────
  const pause  = useCallback(() => stopLoop(), [stopLoop]);
  const resume = useCallback(() => {
    if (engineRef.current && !runningRef.current) {
      startLoop(engineRef.current);
    }
  }, [startLoop]);

  const reset = useCallback(() => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    const bodiesToRemove = engine.world.bodies.filter(b => !b.isStatic);
    World.remove(engine.world, bodiesToRemove);
    const constraintsToRemove = engine.world.constraints.filter(
      c => c.label !== 'Mouse Constraint'
    );
    World.remove(engine.world, constraintsToRemove);
    motorsRef.current.clear();
  }, []);

  // ─── Add body ──────────────────────────────────────
  const addBody = useCallback((type, opts = {}) => {
    if (!engineRef.current) return null;

    const x = opts.x || width / 2;
    const y = opts.y || 100;
    let body;

    if (type === 'circle') {
      const radius = opts.radius || 25;
      body = Bodies.circle(x, y, radius, {
        restitution: 0.5,
        friction: 0.1,
        render: {
          fillStyle: opts.color || '#6366f1',
          strokeStyle: '#4f46e5',
          lineWidth: 2,
        },
        ...opts.options,
      });
      body._bodyType = 'circle';
      body._dimensions = { radius };
    } else if (type === 'triangle') {
      const size = opts.size || 50;
      body = Bodies.polygon(x, y, 3, size / 1.5, {
        restitution: 0.4,
        friction: 0.1,
        render: {
          fillStyle: opts.color || '#f59e0b',
          strokeStyle: '#d97706',
          lineWidth: 2,
        },
        ...opts.options,
      });
      body._bodyType = 'triangle';
      body._dimensions = { size };
    } else if (type === 'platform') {
      // static platform for building structures
      const w = opts.width || 200;
      const h = opts.height || 16;
      body = Bodies.rectangle(x, y, w, h, {
        isStatic: true,
        render: {
          fillStyle: opts.color || '#334155',
          strokeStyle: '#475569',
          lineWidth: 2,
        },
        ...opts.options,
      });
      body._bodyType = 'platform';
      body._dimensions = { width: w, height: h };
    } else {
      const w = opts.width || 50;
      const h = opts.height || 50;
      body = Bodies.rectangle(x, y, w, h, {
        restitution: 0.3,
        friction: 0.1,
        render: {
          fillStyle: opts.color || '#22d3ee',
          strokeStyle: '#06b6d4',
          lineWidth: 2,
        },
        ...opts.options,
      });
      body._bodyType = 'rectangle';
      body._dimensions = { width: w, height: h };
    }

    body.label = opts.label || `${type}_${body.id}`;
    World.add(engineRef.current.world, body);
    return body;
  }, [width]);

  // ─── Add constraint ───────────────────────────────
  const addConstraint = useCallback((type, bodyA, bodyB, opts = {}) => {
    if (!engineRef.current) return null;

    // for motors, we don't create a matter constraint
    if (type === 'motor') {
      if (bodyA) {
        const speed = opts.motorSpeed || 0.05;
        motorsRef.current.set(bodyA.id, speed);
        bodyA._motorSpeed = speed;
        bodyA._hasMotor = true;
      }
      return { _type: 'motor', bodyId: bodyA?.id };
    }

    const preset = CONSTRAINT_PRESETS[type] || CONSTRAINT_PRESETS.pin;
    const style  = CONSTRAINT_STYLES[type] || CONSTRAINT_STYLES.pin;

    // figure out the length — for pin it's always 0,
    // for spring/rope auto-calculate from current distance
    let constraintLength = preset.length;
    if (constraintLength === null && bodyA && bodyB) {
      const dx = bodyB.position.x - bodyA.position.x;
      const dy = bodyB.position.y - bodyA.position.y;
      constraintLength = Math.sqrt(dx * dx + dy * dy);
    }

    const constraint = Constraint.create({
      bodyA,
      bodyB,
      stiffness: opts.stiffness ?? preset.stiffness,
      damping:   opts.damping ?? preset.damping,
      length:    opts.length ?? constraintLength ?? 0,
      render: {
        strokeStyle: style.strokeStyle,
        lineWidth:   style.lineWidth,
        visible: true,
        type: style.type || undefined,
      },
    });

    constraint._constraintType = type;
    constraint.label = `${type}_${constraint.id}`;

    World.add(engineRef.current.world, constraint);
    return constraint;
  }, []);

  // ─── Remove constraint ────────────────────────────
  const removeConstraint = useCallback((constraintOrId) => {
    if (!engineRef.current) return;
    const world = engineRef.current.world;

    if (typeof constraintOrId === 'object') {
      World.remove(world, constraintOrId);
    } else {
      const c = world.constraints.find(x => x.id === constraintOrId);
      if (c) World.remove(world, c);
    }
  }, []);

  // ─── Update body properties live ──────────────────
  const updateBody = useCallback((bodyId, props) => {
    if (!engineRef.current) return;
    const body = engineRef.current.world.bodies.find(b => b.id === bodyId);
    if (!body) return;

    if (props.density !== undefined) {
      Body.setDensity(body, props.density);
    }
    if (props.friction !== undefined) {
      body.friction = props.friction;
    }
    if (props.restitution !== undefined) {
      body.restitution = props.restitution;
    }
    if (props.isStatic !== undefined) {
      Body.setStatic(body, props.isStatic);
    }
    if (props.fillStyle !== undefined) {
      body.render.fillStyle = props.fillStyle;
    }
    if (props.strokeStyle !== undefined) {
      body.render.strokeStyle = props.strokeStyle;
    }
    if (props.angle !== undefined) {
      Body.setAngle(body, props.angle);
    }
  }, []);

  // ─── Update constraint properties live ────────────
  const updateConstraint = useCallback((constraintId, props) => {
    if (!engineRef.current) return;
    const c = engineRef.current.world.constraints.find(x => x.id === constraintId);
    if (!c) return;

    if (props.stiffness !== undefined) c.stiffness = props.stiffness;
    if (props.damping   !== undefined) c.damping   = props.damping;
    if (props.length    !== undefined) c.length    = props.length;
  }, []);

  // ─── Update motor speed ───────────────────────────
  const setMotorSpeed = useCallback((bodyId, speed) => {
    if (speed === 0) {
      motorsRef.current.delete(bodyId);
    } else {
      motorsRef.current.set(bodyId, speed);
    }
    // also update the body tag so it shows in the properties panel
    if (engineRef.current) {
      const body = engineRef.current.world.bodies.find(b => b.id === bodyId);
      if (body) body._motorSpeed = speed;
    }
  }, []);

  // ─── Remove body ──────────────────────────────────
  const removeBody = useCallback((bodyId) => {
    if (!engineRef.current) return;
    const world = engineRef.current.world;
    const body = world.bodies.find(b => b.id === bodyId);
    if (!body) return;

    // also remove any constraints attached to this body
    const attached = world.constraints.filter(
      c => (c.bodyA && c.bodyA.id === bodyId) || (c.bodyB && c.bodyB.id === bodyId)
    );
    attached.forEach(c => World.remove(world, c));

    // remove motor if any
    motorsRef.current.delete(bodyId);

    World.remove(world, body);
  }, []);

  // ─── Hit test ─────────────────────────────────────
  const getBodyAtPosition = useCallback((x, y) => {
    if (!engineRef.current) return null;
    const hits = Query.point(engineRef.current.world.bodies, { x, y });
    // return the first non-static body, or the first static, or null
    const dynamic = hits.find(b => !b.isStatic);
    return dynamic || hits[0] || null;
  }, []);

  // ─── Get all non-mouse constraints ────────────────
  const getConstraints = useCallback(() => {
    if (!engineRef.current) return [];
    return engineRef.current.world.constraints.filter(
      c => c.label !== 'Mouse Constraint'
    );
  }, []);

  // ─── Get all dynamic bodies ───────────────────────
  const getBodies = useCallback(() => {
    if (!engineRef.current) return [];
    return engineRef.current.world.bodies.filter(b => !b.isStatic || b._bodyType === 'platform');
  }, []);

  return {
    engineRef,
    renderRef,
    isRunning,
    pause,
    resume,
    reset,
    addBody,
    addConstraint,
    removeConstraint,
    updateBody,
    updateConstraint,
    setMotorSpeed,
    removeBody,
    getBodyAtPosition,
    getConstraints,
    getBodies,
    motorsRef,
  };
}
