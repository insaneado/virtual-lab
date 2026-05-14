/**
 * client/src/hooks/usePhysicsEngine.js
 * ────────────────────────────────────────────────────────
 * Custom hook that owns the entire Matter.js lifecycle.
 *
 * Returns refs to the engine, world, and render, plus
 * control functions (pause, resume, reset). The engine
 * runs on requestAnimationFrame — we never use
 * Matter.Runner because it doesn't give us frame-budget
 * control and will fight with React's update cycle.
 *
 * The hook manages:
 *   - Engine + World creation
 *   - Render (canvas) creation and mounting
 *   - Mouse + MouseConstraint for drag interaction
 *   - Manual rAF loop with fixed timestep
 *   - Full cleanup on unmount
 * ────────────────────────────────────────────────────────
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import Matter from 'matter-js';

const {
  Engine, Render, World, Mouse,
  MouseConstraint, Bodies, Events, Body,
} = Matter;

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

  const [isRunning, setIsRunning] = useState(false);

  // ─── Initialize engine + renderer ──────────────────
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    // Create the physics engine
    const engine = Engine.create({
      gravity: { x: gravity.x, y: gravity.y, scale: 0.001 },
      positionIterations: 6,
      velocityIterations: 4,
    });

    // Create the canvas renderer
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

    // Keep the render's internal mouse in sync
    render.mouse = mouse;

    // Store refs
    engineRef.current = engine;
    renderRef.current = render;

    // Add ground and walls so things don't fall into the void
    const wallOptions = {
      isStatic: true,
      render: {
        fillStyle: '#1e293b',
        strokeStyle: '#334155',
        lineWidth: 2,
      },
    };

    const ground = Bodies.rectangle(width / 2, height + 25, width + 100, 50, wallOptions);
    const leftWall = Bodies.rectangle(-25, height / 2, 50, height, wallOptions);
    const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height, wallOptions);

    World.add(engine.world, [ground, leftWall, rightWall]);

    // Start rendering (visual only — physics loop is separate)
    Render.run(render);

    // Start the physics loop
    startLoop(engine);

    // ─── Cleanup ──────────────────────────────────────
    return () => {
      stopLoop();
      Render.stop(render);
      World.clear(engine.world);
      Engine.clear(engine);
      render.canvas.remove();
      render.textures = {};
      engineRef.current = null;
      renderRef.current = null;
    };
  }, []);  // Run once on mount

  // ─── Fixed-timestep physics loop ───────────────────
  const startLoop = useCallback((engine) => {
    const dt = 1000 / 60;  // 16.67ms per tick
    runningRef.current = true;
    setIsRunning(true);

    function tick() {
      if (!runningRef.current) return;
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
  const pause = useCallback(() => stopLoop(), [stopLoop]);

  const resume = useCallback(() => {
    if (engineRef.current && !runningRef.current) {
      startLoop(engineRef.current);
    }
  }, [startLoop]);

  const reset = useCallback(() => {
    if (!engineRef.current) return;
    const engine = engineRef.current;

    // Remove all non-static bodies
    const bodiesToRemove = engine.world.bodies.filter(b => !b.isStatic);
    World.remove(engine.world, bodiesToRemove);

    // Remove all constraints except the mouse constraint
    const constraintsToRemove = engine.world.constraints.filter(
      c => c.label !== 'Mouse Constraint'
    );
    World.remove(engine.world, constraintsToRemove);
  }, []);

  /**
   * Add a body to the world.
   * @param {'rectangle'|'circle'} type
   * @param {Object} opts - { x, y, width, height, radius, options }
   * @returns {Matter.Body}
   */
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

  return {
    engineRef,
    renderRef,
    isRunning,
    pause,
    resume,
    reset,
    addBody,
  };
}
