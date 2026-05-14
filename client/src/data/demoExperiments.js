/**
 * Pre-built experiment scenarios with REAL physics setups.
 * Each has proper bodies, constraints, and makes physical sense.
 * Body IDs are sequential starting from 100 to avoid collisions.
 */

const pin = (aId, bId, opts = {}) => ({
  type: 'pin', bodyAId: aId, bodyBId: bId, stiffness: 1, damping: 0, length: 0,
  render: { strokeStyle: '#f59e0b', lineWidth: 3 }, ...opts,
});

const spring = (aId, bId, len, opts = {}) => ({
  type: 'spring', bodyAId: aId, bodyBId: bId, stiffness: 0.02, damping: 0.005, length: len,
  render: { strokeStyle: '#10b981', lineWidth: 2 }, ...opts,
});

const rope = (aId, bId, len, opts = {}) => ({
  type: 'rope', bodyAId: aId, bodyBId: bId, stiffness: 0.8, damping: 0.05, length: len,
  render: { strokeStyle: '#94a3b8', lineWidth: 2 }, ...opts,
});

const anchorPin = (bId, px, py) => ({
  type: 'pin', bodyAId: null, bodyBId: bId, stiffness: 0.9, damping: 0.02, length: 0,
  pointA: { x: px, y: py }, render: { strokeStyle: '#f59e0b', lineWidth: 2 },
});

export const DEMO_EXPERIMENTS = [
  {
    _id: 'demo-pendulum',
    title: 'Simple Pendulum',
    description: 'A ball pinned to a fixed point swings under gravity, demonstrating simple harmonic motion. Drag the ball sideways and release!',
    category: 'mechanics',
    difficulty: 'beginner',
    tags: ['pendulum', 'gravity', 'oscillation'],
    forkCount: 42,
    worldState: {
      gravity: { x: 0, y: 1 },
      bodies: [
        { id: 100, bodyType: 'platform', position: { x: 640, y: 120 }, dimensions: { width: 60, height: 10 }, isStatic: true, render: { fillStyle: '#475569', strokeStyle: '#64748b', lineWidth: 2 } },
        { id: 101, bodyType: 'circle', position: { x: 780, y: 120 }, dimensions: { radius: 22 }, isStatic: false, material: { density: 0.005, friction: 0.01, restitution: 0.1 }, render: { fillStyle: '#6366f1', strokeStyle: '#4f46e5', lineWidth: 2 } },
      ],
      constraints: [
        { type: 'pin', bodyAId: 100, bodyBId: 101, stiffness: 0.9, damping: 0, length: 200, render: { strokeStyle: '#f59e0b', lineWidth: 2 } },
      ],
    },
  },
  {
    _id: 'demo-newtons-cradle',
    title: "Newton's Cradle",
    description: 'Five balls on strings demonstrate conservation of momentum and energy. Pull the leftmost ball and release!',
    category: 'mechanics',
    difficulty: 'intermediate',
    tags: ['momentum', 'collision', 'energy'],
    forkCount: 67,
    worldState: {
      gravity: { x: 0, y: 1 },
      bodies: [
        { id: 100, bodyType: 'platform', position: { x: 640, y: 80 }, dimensions: { width: 260, height: 10 }, isStatic: true, render: { fillStyle: '#334155', strokeStyle: '#475569', lineWidth: 2 } },
        { id: 201, bodyType: 'circle', position: { x: 560, y: 280 }, dimensions: { radius: 20 }, isStatic: false, material: { density: 0.008, friction: 0.01, restitution: 0.99 }, render: { fillStyle: '#6366f1', strokeStyle: '#4f46e5', lineWidth: 2 } },
        { id: 202, bodyType: 'circle', position: { x: 600, y: 280 }, dimensions: { radius: 20 }, isStatic: false, material: { density: 0.008, friction: 0.01, restitution: 0.99 }, render: { fillStyle: '#8b5cf6', strokeStyle: '#7c3aed', lineWidth: 2 } },
        { id: 203, bodyType: 'circle', position: { x: 640, y: 280 }, dimensions: { radius: 20 }, isStatic: false, material: { density: 0.008, friction: 0.01, restitution: 0.99 }, render: { fillStyle: '#a855f7', strokeStyle: '#9333ea', lineWidth: 2 } },
        { id: 204, bodyType: 'circle', position: { x: 680, y: 280 }, dimensions: { radius: 20 }, isStatic: false, material: { density: 0.008, friction: 0.01, restitution: 0.99 }, render: { fillStyle: '#22d3ee', strokeStyle: '#06b6d4', lineWidth: 2 } },
        { id: 205, bodyType: 'circle', position: { x: 720, y: 280 }, dimensions: { radius: 20 }, isStatic: false, material: { density: 0.008, friction: 0.01, restitution: 0.99 }, render: { fillStyle: '#10b981', strokeStyle: '#059669', lineWidth: 2 } },
      ],
      constraints: [
        anchorPin(201, 560, 80),
        anchorPin(202, 600, 80),
        anchorPin(203, 640, 80),
        anchorPin(204, 680, 80),
        anchorPin(205, 720, 80),
      ],
    },
  },
  {
    _id: 'demo-bridge',
    title: 'Suspension Bridge',
    description: 'A chain of small blocks connected by springs forms a flexible bridge between two towers. Drop objects on it to test structural integrity!',
    category: 'structures',
    difficulty: 'intermediate',
    tags: ['bridge', 'springs', 'stress-test'],
    forkCount: 31,
    worldState: {
      gravity: { x: 0, y: 1 },
      bodies: [
        // Two pillars
        { id: 100, bodyType: 'platform', position: { x: 280, y: 350 }, dimensions: { width: 40, height: 200 }, isStatic: true, render: { fillStyle: '#475569', strokeStyle: '#64748b', lineWidth: 2 } },
        { id: 101, bodyType: 'platform', position: { x: 1000, y: 350 }, dimensions: { width: 40, height: 200 }, isStatic: true, render: { fillStyle: '#475569', strokeStyle: '#64748b', lineWidth: 2 } },
        // Bridge segments
        { id: 301, bodyType: 'rectangle', position: { x: 370, y: 260 }, dimensions: { width: 80, height: 12 }, isStatic: false, material: { density: 0.003, friction: 0.8, restitution: 0.1 }, render: { fillStyle: '#d97706', strokeStyle: '#b45309', lineWidth: 1 } },
        { id: 302, bodyType: 'rectangle', position: { x: 460, y: 260 }, dimensions: { width: 80, height: 12 }, isStatic: false, material: { density: 0.003, friction: 0.8, restitution: 0.1 }, render: { fillStyle: '#f59e0b', strokeStyle: '#d97706', lineWidth: 1 } },
        { id: 303, bodyType: 'rectangle', position: { x: 550, y: 260 }, dimensions: { width: 80, height: 12 }, isStatic: false, material: { density: 0.003, friction: 0.8, restitution: 0.1 }, render: { fillStyle: '#d97706', strokeStyle: '#b45309', lineWidth: 1 } },
        { id: 304, bodyType: 'rectangle', position: { x: 640, y: 260 }, dimensions: { width: 80, height: 12 }, isStatic: false, material: { density: 0.003, friction: 0.8, restitution: 0.1 }, render: { fillStyle: '#f59e0b', strokeStyle: '#d97706', lineWidth: 1 } },
        { id: 305, bodyType: 'rectangle', position: { x: 730, y: 260 }, dimensions: { width: 80, height: 12 }, isStatic: false, material: { density: 0.003, friction: 0.8, restitution: 0.1 }, render: { fillStyle: '#d97706', strokeStyle: '#b45309', lineWidth: 1 } },
        { id: 306, bodyType: 'rectangle', position: { x: 820, y: 260 }, dimensions: { width: 80, height: 12 }, isStatic: false, material: { density: 0.003, friction: 0.8, restitution: 0.1 }, render: { fillStyle: '#f59e0b', strokeStyle: '#d97706', lineWidth: 1 } },
        { id: 307, bodyType: 'rectangle', position: { x: 910, y: 260 }, dimensions: { width: 80, height: 12 }, isStatic: false, material: { density: 0.003, friction: 0.8, restitution: 0.1 }, render: { fillStyle: '#d97706', strokeStyle: '#b45309', lineWidth: 1 } },
        // Heavy ball to drop on bridge
        { id: 400, bodyType: 'circle', position: { x: 640, y: 80 }, dimensions: { radius: 28 }, isStatic: false, material: { density: 0.01, friction: 0.5, restitution: 0.2 }, render: { fillStyle: '#f43f5e', strokeStyle: '#e11d48', lineWidth: 2 } },
      ],
      constraints: [
        // Pin left pillar to first segment
        pin(100, 301),
        // Chain segments together
        pin(301, 302), pin(302, 303), pin(303, 304),
        pin(304, 305), pin(305, 306), pin(306, 307),
        // Pin last segment to right pillar
        pin(307, 101),
      ],
    },
  },
  {
    _id: 'demo-double-pendulum',
    title: 'Double Pendulum (Chaos)',
    description: 'Two pendulums linked end-to-end create chaotic, unpredictable motion — a classic demonstration of chaos theory.',
    category: 'mechanics',
    difficulty: 'advanced',
    tags: ['chaos', 'pendulum', 'nonlinear'],
    forkCount: 53,
    worldState: {
      gravity: { x: 0, y: 1 },
      bodies: [
        { id: 100, bodyType: 'platform', position: { x: 640, y: 100 }, dimensions: { width: 40, height: 10 }, isStatic: true, render: { fillStyle: '#475569', strokeStyle: '#64748b', lineWidth: 2 } },
        { id: 101, bodyType: 'circle', position: { x: 740, y: 250 }, dimensions: { radius: 18 }, isStatic: false, material: { density: 0.006, friction: 0.01, restitution: 0.1 }, render: { fillStyle: '#f43f5e', strokeStyle: '#e11d48', lineWidth: 2 } },
        { id: 102, bodyType: 'circle', position: { x: 840, y: 400 }, dimensions: { radius: 14 }, isStatic: false, material: { density: 0.006, friction: 0.01, restitution: 0.1 }, render: { fillStyle: '#22d3ee', strokeStyle: '#06b6d4', lineWidth: 2 } },
      ],
      constraints: [
        { type: 'pin', bodyAId: 100, bodyBId: 101, stiffness: 0.9, damping: 0, length: 160, render: { strokeStyle: '#f59e0b', lineWidth: 2 } },
        { type: 'pin', bodyAId: 101, bodyBId: 102, stiffness: 0.9, damping: 0, length: 160, render: { strokeStyle: '#f59e0b', lineWidth: 2 } },
      ],
    },
  },
  {
    _id: 'demo-catapult',
    title: 'Catapult Machine',
    description: 'A lever balanced on a fulcrum with a heavy weight on one end. Drop a ball on the short side to launch the projectile!',
    category: 'machines',
    difficulty: 'intermediate',
    tags: ['lever', 'catapult', 'projectile'],
    forkCount: 28,
    worldState: {
      gravity: { x: 0, y: 1 },
      bodies: [
        // Fulcrum
        { id: 100, bodyType: 'triangle', position: { x: 500, y: 560 }, dimensions: { size: 50 }, isStatic: true, render: { fillStyle: '#475569', strokeStyle: '#64748b', lineWidth: 2 } },
        // Lever arm
        { id: 101, bodyType: 'rectangle', position: { x: 500, y: 520 }, dimensions: { width: 350, height: 10 }, isStatic: false, material: { density: 0.002, friction: 0.8, restitution: 0.1 }, render: { fillStyle: '#d97706', strokeStyle: '#b45309', lineWidth: 2 } },
        // Projectile (light ball on the long end)
        { id: 102, bodyType: 'circle', position: { x: 340, y: 505 }, dimensions: { radius: 14 }, isStatic: false, material: { density: 0.003, friction: 0.3, restitution: 0.5 }, render: { fillStyle: '#22d3ee', strokeStyle: '#06b6d4', lineWidth: 2 } },
        // Heavy ball to drop
        { id: 103, bodyType: 'circle', position: { x: 660, y: 100 }, dimensions: { radius: 30 }, isStatic: false, material: { density: 0.015, friction: 0.5, restitution: 0.1 }, render: { fillStyle: '#f43f5e', strokeStyle: '#e11d48', lineWidth: 2 } },
        // Target platform
        { id: 104, bodyType: 'platform', position: { x: 150, y: 500 }, dimensions: { width: 80, height: 14 }, isStatic: true, render: { fillStyle: '#10b981', strokeStyle: '#059669', lineWidth: 2 } },
      ],
      constraints: [
        pin(100, 101),
      ],
    },
  },
  {
    _id: 'demo-wrecking-ball',
    title: 'Wrecking Ball',
    description: 'A massive ball on a rope swings into a stack of blocks, demonstrating energy transfer and destruction.',
    category: 'machines',
    difficulty: 'beginner',
    tags: ['demolition', 'energy', 'collision'],
    forkCount: 55,
    worldState: {
      gravity: { x: 0, y: 1 },
      bodies: [
        { id: 100, bodyType: 'platform', position: { x: 300, y: 60 }, dimensions: { width: 40, height: 10 }, isStatic: true, render: { fillStyle: '#475569', strokeStyle: '#64748b', lineWidth: 2 } },
        // Wrecking ball (pulled to the left)
        { id: 101, bodyType: 'circle', position: { x: 100, y: 200 }, dimensions: { radius: 35 }, isStatic: false, material: { density: 0.02, friction: 0.3, restitution: 0.3 }, render: { fillStyle: '#f43f5e', strokeStyle: '#e11d48', lineWidth: 3 } },
        // Block tower
        { id: 201, bodyType: 'rectangle', position: { x: 700, y: 640 }, dimensions: { width: 40, height: 40 }, isStatic: false, material: { density: 0.002, friction: 0.6, restitution: 0.05 }, render: { fillStyle: '#6366f1', strokeStyle: '#4f46e5', lineWidth: 1 } },
        { id: 202, bodyType: 'rectangle', position: { x: 745, y: 640 }, dimensions: { width: 40, height: 40 }, isStatic: false, material: { density: 0.002, friction: 0.6, restitution: 0.05 }, render: { fillStyle: '#8b5cf6', strokeStyle: '#7c3aed', lineWidth: 1 } },
        { id: 203, bodyType: 'rectangle', position: { x: 700, y: 595 }, dimensions: { width: 40, height: 40 }, isStatic: false, material: { density: 0.002, friction: 0.6, restitution: 0.05 }, render: { fillStyle: '#a855f7', strokeStyle: '#9333ea', lineWidth: 1 } },
        { id: 204, bodyType: 'rectangle', position: { x: 745, y: 595 }, dimensions: { width: 40, height: 40 }, isStatic: false, material: { density: 0.002, friction: 0.6, restitution: 0.05 }, render: { fillStyle: '#6366f1', strokeStyle: '#4f46e5', lineWidth: 1 } },
        { id: 205, bodyType: 'rectangle', position: { x: 722, y: 550 }, dimensions: { width: 40, height: 40 }, isStatic: false, material: { density: 0.002, friction: 0.6, restitution: 0.05 }, render: { fillStyle: '#22d3ee', strokeStyle: '#06b6d4', lineWidth: 1 } },
      ],
      constraints: [
        { type: 'rope', bodyAId: 100, bodyBId: 101, stiffness: 0.9, damping: 0.01, length: 250, render: { strokeStyle: '#94a3b8', lineWidth: 2 } },
      ],
    },
  },
];
