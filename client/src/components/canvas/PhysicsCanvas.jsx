import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Matter from 'matter-js';
import toast from 'react-hot-toast';
import { Circle, Hexagon, Link2, MousePointer2, Move, Play, RotateCw, Square, Trash2 } from 'lucide-react';
import { getSocket } from '../../services/socketClient.js';
import useAnalyticsStore from '../../stores/useAnalyticsStore.js';
import useCanvasStore from '../../stores/useCanvasStore.js';
import useRoomStore from '../../stores/useRoomStore.js';
import {
  createBox,
  createCircle,
  createPolygon,
  serializeBody,
} from '../../utils/bodyFactory.js';
import {
  createMotor,
  createPivotConnection,
  createRope,
  createSpring,
  serializeConstraint,
} from '../../utils/constraintFactory.js';
import {
  applyRemoteBody,
  applyRemoteConstraint,
  clearUserWorld,
  findBodyById,
  findConstraintById,
  getUserBodies,
  getUserConstraints,
  randomBodyColor,
  restoreWorld,
  serializeWorld,
  updateBodyProperties,
} from '../../utils/matterHelpers.js';
import PropertiesPanel from '../panels/PropertiesPanel.jsx';
import AnalyticsDashboard from '../panels/AnalyticsDashboard.jsx';

const {
  Body,
  Bodies,
  Composite,
  Engine,
  Events,
  Mouse,
  MouseConstraint,
  Query,
  Render,
  Runner,
  World,
} = Matter;

const TOOLS = [
  { id: 'select', label: 'Select', icon: MousePointer2 },
  { id: 'box', label: 'Box', icon: Square },
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'polygon', label: 'Polygon', icon: Hexagon },
  { id: 'rope', label: 'Rope', icon: Link2 },
  { id: 'spring', label: 'Spring', icon: Link2 },
  { id: 'pivot', label: 'Pivot', icon: RotateCw },
  { id: 'motor', label: 'Motor', icon: Play },
  { id: 'delete', label: 'Delete', icon: Trash2 },
  { id: 'pan', label: 'Pan', icon: Move },
];

function screenToWorld(render, event) {
  const rect = render.canvas.getBoundingClientRect();
  const bounds = render.bounds;
  return {
    x: bounds.min.x + ((event.clientX - rect.left) / rect.width) * (bounds.max.x - bounds.min.x),
    y: bounds.min.y + ((event.clientY - rect.top) / rect.height) * (bounds.max.y - bounds.min.y),
  };
}

function createStaticBoundaries(width, height, includeWalls) {
  const render = { fillStyle: '#1f2937', strokeStyle: '#334155', lineWidth: 1 };
  const ground = Bodies.rectangle(width / 2, height + 25, width * 3, 50, {
    isStatic: true,
    label: 'ground',
    render,
  });
  ground.plugin = { virtualLabBoundary: true };
  const walls = includeWalls
    ? [
        Bodies.rectangle(-25, height / 2, 50, height * 2, { isStatic: true, label: 'left-wall', render }),
        Bodies.rectangle(width + 25, height / 2, 50, height * 2, { isStatic: true, label: 'right-wall', render }),
      ]
    : [];
  walls.forEach((wall) => {
    wall.plugin = { virtualLabBoundary: true };
  });
  return [ground, ...walls];
}

function bodyMoved(prev, next) {
  if (!prev) return true;
  return (
    Math.abs(prev.x - next.position.x) > 0.5 ||
    Math.abs(prev.y - next.position.y) > 0.5 ||
    Math.abs(prev.angle - next.angle) > 0.01 ||
    Math.abs(prev.vx - next.velocity.x) > 0.1 ||
    Math.abs(prev.vy - next.velocity.y) > 0.1
  );
}

function PhysicsCanvas({ token, roomId, externalSnapshot, onSnapshotChange }) {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const renderRef = useRef(null);
  const runnerRef = useRef(null);
  const motorsRef = useRef(new Map());
  const pendingConstraintRef = useRef(null);
  const panningRef = useRef(null);
  const cursorEmitRef = useRef(0);
  const socketRef = useRef(null);
  const lastBodyEmitRef = useRef(0);
  const lastBodySnapshotRef = useRef(new Map());
  const analyticsLastRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const crashCountRef = useRef(0);
  const [selectedBody, setSelectedBody] = useState(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [viewport, setViewport] = useState({ width: 1280, height: 720 });

  const selectedTool = useCanvasStore((state) => state.selectedTool);
  const setSelectedTool = useCanvasStore((state) => state.setSelectedTool);
  const setSelectedBodyIds = useCanvasStore((state) => state.setSelectedBodyIds);
  const clearSelection = useCanvasStore((state) => state.clearSelection);
  const wallsEnabled = useCanvasStore((state) => state.wallsEnabled);
  const setWallsEnabled = useCanvasStore((state) => state.setWallsEnabled);
  const cursors = useRoomStore((state) => state.cursors);
  const connectionWarning = useRoomStore((state) => state.connectionWarning);
  const pushSample = useAnalyticsStore((state) => state.pushSample);

  const remoteCursors = useMemo(() => Object.values(cursors), [cursors]);

  const emitSnapshotChange = useCallback(() => {
    if (!engineRef.current) return;
    onSnapshotChange?.(serializeWorld(engineRef.current.world, Array.from(motorsRef.current.entries()).map(([bodyId, speed]) => ({
      id: `motor_${bodyId}`,
      type: 'motor',
      bodyId,
      speed,
    }))));
  }, [onSnapshotChange]);

  const emitBodyAdd = useCallback((body) => {
    socketRef.current?.emit('body:add', { body: serializeBody(body), timestamp: Date.now() });
    emitSnapshotChange();
  }, [emitSnapshotChange]);

  const emitBodyUpdate = useCallback((body) => {
    socketRef.current?.emit('body:update', {
      bodyId: body.label,
      body: serializeBody(body),
      position: { x: body.position.x, y: body.position.y },
      velocity: { x: body.velocity.x, y: body.velocity.y },
      angle: body.angle,
      angularVelocity: body.angularVelocity,
      timestamp: Date.now(),
    });
  }, []);

  const emitConstraintAdd = useCallback((constraint) => {
    socketRef.current?.emit('constraint:add', { constraint: serializeConstraint(constraint), timestamp: Date.now() });
    emitSnapshotChange();
  }, [emitSnapshotChange]);

  const addBodyAt = useCallback((tool, point) => {
    if (!engineRef.current) return null;
    const color = randomBodyColor();
    const body = tool === 'circle'
      ? createCircle({ x: point.x, y: point.y, color })
      : tool === 'polygon'
        ? createPolygon({ x: point.x, y: point.y, sides: 5, radius: 38, color })
        : createBox({ x: point.x, y: point.y, color });
    World.add(engineRef.current.world, body);
    emitBodyAdd(body);
    return body;
  }, [emitBodyAdd]);

  const removeBody = useCallback((body) => {
    if (!engineRef.current || !body) return;
    const world = engineRef.current.world;
    const attached = world.constraints.filter((constraint) => (
      constraint.bodyA?.label === body.label || constraint.bodyB?.label === body.label
    ));
    World.remove(world, attached);
    World.remove(world, body);
    motorsRef.current.delete(body.label);
    socketRef.current?.emit('body:remove', { bodyId: body.label, timestamp: Date.now() });
    attached.forEach((constraint) => socketRef.current?.emit('constraint:remove', {
      constraintId: constraint.label,
      timestamp: Date.now(),
    }));
    setSelectedBody(null);
    clearSelection();
    emitSnapshotChange();
  }, [clearSelection, emitSnapshotChange]);

  const handleConstraintBodyClick = useCallback((body) => {
    if (!engineRef.current) return;
    if (selectedTool === 'motor') {
      const motor = createMotor(body, { speed: 0.08 });
      motorsRef.current.set(body.label, motor.speed);
      emitConstraintAdd(motor);
      setSelectedTool('select');
      return;
    }

    if (!pendingConstraintRef.current) {
      pendingConstraintRef.current = body;
      return;
    }

    const bodyA = pendingConstraintRef.current;
    const bodyB = body;
    pendingConstraintRef.current = null;
    if (bodyA.label === bodyB.label) return;

    if (selectedTool === 'rope') {
      const rope = createRope(bodyA, bodyB);
      Composite.add(engineRef.current.world, rope.composite);
      rope.bodies.forEach(emitBodyAdd);
      rope.constraints.forEach(emitConstraintAdd);
    } else {
      const constraint = selectedTool === 'spring'
        ? createSpring(bodyA, bodyB)
        : createPivotConnection(bodyA, bodyB);
      World.add(engineRef.current.world, constraint);
      emitConstraintAdd(constraint);
    }
    setSelectedTool('select');
  }, [emitBodyAdd, emitConstraintAdd, selectedTool, setSelectedTool]);

  const handleCanvasClick = useCallback((event) => {
    const engine = engineRef.current;
    const render = renderRef.current;
    if (!engine || !render) return;

    const point = screenToWorld(render, event);
    const hits = Query.point(getUserBodies(engine.world), point);
    const body = hits[0] || null;

    if (['box', 'circle', 'polygon'].includes(selectedTool)) {
      addBodyAt(selectedTool, point);
      return;
    }

    if (['rope', 'spring', 'pivot', 'motor'].includes(selectedTool)) {
      if (body) handleConstraintBodyClick(body);
      return;
    }

    if (selectedTool === 'delete') {
      if (body) removeBody(body);
      return;
    }

    if (body) {
      setSelectedBody(body);
      setSelectedBodyIds([body.label]);
    } else {
      setSelectedBody(null);
      clearSelection();
    }
  }, [
    addBodyAt,
    clearSelection,
    handleConstraintBodyClick,
    removeBody,
    selectedTool,
    setSelectedBodyIds,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    setViewport({ width, height });

    const engine = Engine.create();
    engine.gravity.y = 1;
    const render = Render.create({
      element: container,
      engine,
      options: {
        width,
        height,
        background: '#0a0e17',
        wireframes: false,
        pixelRatio: window.devicePixelRatio || 1,
        hasBounds: true,
      },
    });
    const runner = Runner.create();
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.18,
        render: { visible: false },
      },
    });

    engineRef.current = engine;
    renderRef.current = render;
    runnerRef.current = runner;

    World.add(engine.world, createStaticBoundaries(width, height, useCanvasStore.getState().wallsEnabled));
    World.add(engine.world, mouseConstraint);
    render.mouse = mouse;
    Render.run(render);
    Runner.run(runner, engine);

    const afterUpdate = () => {
      try {
        const now = Date.now();
        motorsRef.current.forEach((speed, bodyId) => {
          const body = findBodyById(engine.world, bodyId);
          if (body && !body.isStatic) Body.setAngularVelocity(body, speed);
        });

        if (now - analyticsLastRef.current >= 100) {
          analyticsLastRef.current = now;
          const watched = useCanvasStore.getState().watchedBodyIds;
          const bodies = getUserBodies(engine.world).filter((body) => watched.includes(body.label));
          bodies.forEach((body) => {
            const speed = Math.hypot(body.velocity.x, body.velocity.y);
            const force = Math.hypot(body.force.x, body.force.y);
            pushSample(body.label, {
              t: Number(((now - startTimeRef.current) / 1000).toFixed(1)),
              velocity: Number(speed.toFixed(2)),
              kineticEnergy: Number((0.5 * body.mass * speed * speed).toFixed(2)),
              force: Number(force.toFixed(4)),
            });
          });
        }

        if (now - lastBodyEmitRef.current >= 1000 / 30) {
          lastBodyEmitRef.current = now;
          getUserBodies(engine.world).forEach((body) => {
            const previous = lastBodySnapshotRef.current.get(body.label);
            if (bodyMoved(previous, body)) {
              lastBodySnapshotRef.current.set(body.label, {
                x: body.position.x,
                y: body.position.y,
                vx: body.velocity.x,
                vy: body.velocity.y,
                angle: body.angle,
              });
              emitBodyUpdate(body);
            }
          });
        }
        crashCountRef.current = 0;
      } catch (err) {
        crashCountRef.current += 1;
        if (crashCountRef.current >= 3) {
          clearUserWorld(engine.world);
          motorsRef.current.clear();
          crashCountRef.current = 0;
          toast.error('Physics engine recovered after repeated update failures.');
        }
      }
    };

    Events.on(engine, 'afterUpdate', afterUpdate);

    return () => {
      Events.off(engine, 'afterUpdate', afterUpdate);
      Runner.stop(runner);
      Render.stop(render);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      render.canvas.remove();
      render.textures = {};
      engineRef.current = null;
      renderRef.current = null;
      runnerRef.current = null;
    };
  }, [emitBodyUpdate, pushSample]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const boundaries = engine.world.bodies.filter((body) => body.plugin?.virtualLabBoundary);
    World.remove(engine.world, boundaries);
    World.add(engine.world, createStaticBoundaries(viewport.width, viewport.height, wallsEnabled));
  }, [wallsEnabled, viewport.height, viewport.width]);

  useEffect(() => {
    if (!token || !roomId) return undefined;
    const socket = getSocket(token);
    socketRef.current = socket;

    const onSnapshot = (snapshot) => {
      if (!engineRef.current) return;
      restoreWorld(engineRef.current, snapshot, motorsRef);
      useRoomStore.getState().setUsers(snapshot.users || []);
      emitSnapshotChange();
    };
    const onDelta = (delta) => {
      if (!engineRef.current) return;
      const world = engineRef.current.world;
      (delta.removedBodies || []).forEach((bodyId) => {
        const body = findBodyById(world, bodyId);
        if (body) World.remove(world, body);
      });
      (delta.removedConstraints || []).forEach((constraintId) => {
        const constraint = findConstraintById(world, constraintId);
        if (constraint) World.remove(world, constraint);
      });
      (delta.bodies || []).forEach((bodySnapshot) => applyRemoteBody(world, bodySnapshot));
      (delta.constraints || []).forEach((constraintSnapshot) => applyRemoteConstraint(world, constraintSnapshot, motorsRef));
      emitSnapshotChange();
    };

    socket.on('world:snapshot', onSnapshot);
    socket.on('world:delta', onDelta);
    socket.emit('join-room', { roomId }, (response) => {
      if (!response?.success) toast.error(response?.error || 'Could not join room.');
    });

    return () => {
      socket.off('world:snapshot', onSnapshot);
      socket.off('world:delta', onDelta);
    };
  }, [emitSnapshotChange, roomId, token]);

  useEffect(() => {
    if (!externalSnapshot || !engineRef.current) return;
    restoreWorld(engineRef.current, externalSnapshot, motorsRef);
    getUserBodies(engineRef.current.world).forEach(emitBodyAdd);
    getUserConstraints(engineRef.current.world, Array.from(motorsRef.current.entries()).map(([bodyId, speed]) => ({
      id: `motor_${bodyId}`,
      type: 'motor',
      bodyId,
      speed,
    }))).forEach(emitConstraintAdd);
    emitSnapshotChange();
  }, [emitBodyAdd, emitConstraintAdd, emitSnapshotChange, externalSnapshot]);

  useEffect(() => {
    const render = renderRef.current;
    if (!render) return undefined;
    const canvas = render.canvas;

    function handleWheel(event) {
      event.preventDefault();
      const bounds = render.bounds;
      const mouse = screenToWorld(render, event);
      const currentWidth = bounds.max.x - bounds.min.x;
      const currentHeight = bounds.max.y - bounds.min.y;
      const zoom = Math.min(5, Math.max(0.2, event.deltaY > 0 ? 1.12 : 0.88));
      const width = Math.min(6400, Math.max(256, currentWidth * zoom));
      const height = Math.min(3600, Math.max(144, currentHeight * zoom));
      const ratioX = (mouse.x - bounds.min.x) / currentWidth;
      const ratioY = (mouse.y - bounds.min.y) / currentHeight;
      render.bounds.min.x = mouse.x - width * ratioX;
      render.bounds.min.y = mouse.y - height * ratioY;
      render.bounds.max.x = render.bounds.min.x + width;
      render.bounds.max.y = render.bounds.min.y + height;
    }

    function handleMouseDown(event) {
      const point = screenToWorld(render, event);
      const body = Query.point(getUserBodies(engineRef.current.world), point)[0];
      if (selectedTool === 'pan' || !body) {
        panningRef.current = {
          x: event.clientX,
          y: event.clientY,
          bounds: {
            min: { ...render.bounds.min },
            max: { ...render.bounds.max },
          },
        };
      }
    }

    function handleMouseMove(event) {
      const point = screenToWorld(render, event);
      const now = Date.now();
      if (now - cursorEmitRef.current >= 50) {
        cursorEmitRef.current = now;
        socketRef.current?.emit('cursor:move', point);
      }

      if (!panningRef.current) return;
      const dx = event.clientX - panningRef.current.x;
      const dy = event.clientY - panningRef.current.y;
      const scaleX = (panningRef.current.bounds.max.x - panningRef.current.bounds.min.x) / canvas.clientWidth;
      const scaleY = (panningRef.current.bounds.max.y - panningRef.current.bounds.min.y) / canvas.clientHeight;
      render.bounds.min.x = panningRef.current.bounds.min.x - dx * scaleX;
      render.bounds.max.x = panningRef.current.bounds.max.x - dx * scaleX;
      render.bounds.min.y = panningRef.current.bounds.min.y - dy * scaleY;
      render.bounds.max.y = panningRef.current.bounds.max.y - dy * scaleY;
    }

    function handleMouseUp() {
      panningRef.current = null;
    }

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('click', handleCanvasClick);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleCanvasClick, selectedTool]);

  function handleBodyUpdate(body, patch) {
    updateBodyProperties(body, patch);
    emitBodyUpdate(body);
    emitSnapshotChange();
  }

  const vectorBodies = engineRef.current
    ? getUserBodies(engineRef.current.world).filter((body) => useCanvasStore.getState().watchedBodyIds.includes(body.label))
    : [];

  return (
    <div className="lab-shell">
      <div ref={containerRef} className="matter-host" />
      <div className="toolbar" role="toolbar" aria-label="Physics tools">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              className={`tool-btn ${selectedTool === tool.id ? 'active' : ''}`}
              type="button"
              title={tool.label}
              onClick={() => {
                pendingConstraintRef.current = null;
                setSelectedTool(tool.id);
              }}
            >
              <Icon size={18} />
            </button>
          );
        })}
        <button className={`tool-btn ${wallsEnabled ? 'active' : ''}`} type="button" title="Toggle walls" onClick={() => setWallsEnabled(!wallsEnabled)}>
          Walls
        </button>
      </div>

      {connectionWarning && (
        <div className="connection-banner">Connection lost, attempting to reconnect...</div>
      )}

      {remoteCursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="remote-cursor"
          style={{
            left: cursor.x,
            top: cursor.y,
          }}
        >
          <span />
          <strong>{cursor.username}</strong>
        </div>
      ))}

      <svg className="force-overlay" viewBox={`0 0 ${viewport.width} ${viewport.height}`} preserveAspectRatio="none">
        <defs>
          <marker id="forceArrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#f43f5e" />
          </marker>
        </defs>
        {vectorBodies.map((body) => {
          const magnitude = Math.hypot(body.force.x, body.force.y);
          if (magnitude === 0) return null;
          const scale = Math.min(100, magnitude * 8000);
          const angle = Math.atan2(body.force.y, body.force.x);
          return (
            <line
              key={body.label}
              x1={body.position.x}
              y1={body.position.y}
              x2={body.position.x + Math.cos(angle) * scale}
              y2={body.position.y + Math.sin(angle) * scale}
              stroke="#f43f5e"
              strokeWidth="2"
              markerEnd="url(#forceArrow)"
            />
          );
        })}
      </svg>

      <PropertiesPanel
        body={selectedBody}
        onUpdate={handleBodyUpdate}
        onDelete={removeBody}
        onClose={() => {
          setSelectedBody(null);
          clearSelection();
        }}
      />
      <AnalyticsDashboard open={analyticsOpen} onToggle={() => setAnalyticsOpen((value) => !value)} />
    </div>
  );
}

PhysicsCanvas.propTypes = {
  token: PropTypes.string,
  roomId: PropTypes.string,
  externalSnapshot: PropTypes.object,
  onSnapshotChange: PropTypes.func,
};

PhysicsCanvas.defaultProps = {
  token: '',
  roomId: '',
  externalSnapshot: null,
  onSnapshotChange: undefined,
};

export default memo(PhysicsCanvas);
