/**
 * client/src/hooks/usePhysicsTelemetry.js
 * ────────────────────────────────────────────────────────
 * Collects live physics telemetry from the Matter.js engine
 * at ~5Hz (every 200ms) for the analytics dashboard.
 *
 * Tracked metrics per frame:
 *   - Total kinetic energy
 *   - Average velocity magnitude
 *   - Body count
 *   - Max force magnitude (from collision events)
 *   - Per-body velocity vectors (for arrow overlay)
 *
 * Data is stored as a rolling window (last 100 samples)
 * to keep memory bounded and charts scrolling nicely.
 * ────────────────────────────────────────────────────────
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import Matter from 'matter-js';

const MAX_SAMPLES = 120;
const SAMPLE_INTERVAL = 200; // ms — 5 Hz

export default function usePhysicsTelemetry(engineRef) {
  const [telemetry, setTelemetry] = useState([]);
  const [bodyVectors, setBodyVectors] = useState([]);
  const [maxForce, setMaxForce] = useState(0);
  const samplesRef = useRef([]);
  const intervalRef = useRef(null);
  const forceAccumRef = useRef(0);

  // listen for collision events to track force
  useEffect(() => {
    const engine = engineRef?.current;
    if (!engine) return;

    function onCollision(event) {
      for (const pair of event.pairs) {
        // depth is a rough proxy for contact force in matter.js
        const force = pair.collision?.depth || 0;
        if (force > forceAccumRef.current) {
          forceAccumRef.current = force;
        }
      }
    }

    Matter.Events.on(engine, 'collisionActive', onCollision);
    return () => Matter.Events.off(engine, 'collisionActive', onCollision);
  }, [engineRef?.current]);

  // sampling loop
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const engine = engineRef?.current;
      if (!engine) return;

      const bodies = engine.world.bodies.filter(b => !b.isStatic);
      if (bodies.length === 0) return;

      let totalKE = 0;
      let totalSpeed = 0;
      const vectors = [];

      for (const b of bodies) {
        const vx = b.velocity.x;
        const vy = b.velocity.y;
        const speed = Math.sqrt(vx * vx + vy * vy);
        // KE = 0.5 * m * v^2
        const ke = 0.5 * b.mass * speed * speed;
        totalKE += ke;
        totalSpeed += speed;

        vectors.push({
          id: b.id,
          x: b.position.x,
          y: b.position.y,
          vx, vy,
          speed: Math.round(speed * 100) / 100,
        });
      }

      const sample = {
        time: Date.now(),
        t: samplesRef.current.length,
        ke: Math.round(totalKE * 100) / 100,
        avgSpeed: Math.round((totalSpeed / bodies.length) * 100) / 100,
        bodyCount: bodies.length,
        maxForce: Math.round(forceAccumRef.current * 100) / 100,
      };

      forceAccumRef.current = 0; // reset per sample

      samplesRef.current.push(sample);
      if (samplesRef.current.length > MAX_SAMPLES) {
        samplesRef.current = samplesRef.current.slice(-MAX_SAMPLES);
      }

      setTelemetry([...samplesRef.current]);
      setBodyVectors(vectors);
      setMaxForce(sample.maxForce);
    }, SAMPLE_INTERVAL);

    return () => clearInterval(intervalRef.current);
  }, [engineRef]);

  const clearTelemetry = useCallback(() => {
    samplesRef.current = [];
    setTelemetry([]);
    setBodyVectors([]);
    setMaxForce(0);
  }, []);

  return { telemetry, bodyVectors, maxForce, clearTelemetry };
}
