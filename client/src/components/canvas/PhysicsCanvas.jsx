/**
 * client/src/components/canvas/PhysicsCanvas.jsx
 * ────────────────────────────────────────────────────────
 * The core workspace component. Mounts the Matter.js
 * renderer to a container div and provides the engine
 * via context to child components.
 *
 * This component is responsible for:
 *   - Providing the DOM container ref to usePhysicsEngine
 *   - Handling canvas resize on window resize
 *   - Exposing the engine through PhysicsProvider
 * ────────────────────────────────────────────────────────
 */

import React, { useRef, useEffect } from 'react';
import usePhysicsEngine from '../../hooks/usePhysicsEngine.js';
import { PhysicsProvider } from '../../context/PhysicsContext.jsx';

export default function PhysicsCanvas({ children, width = 1280, height = 720 }) {
  const containerRef = useRef(null);

  const physics = usePhysicsEngine(containerRef, {
    width,
    height,
    gravity: { x: 0, y: 1 },
    wireframes: false,
    background: 'transparent',
  });

  // Handle resize — scale the canvas to fit the container
  useEffect(() => {
    function handleResize() {
      const canvas = containerRef.current?.querySelector('canvas');
      if (!canvas) return;

      const rect = containerRef.current.getBoundingClientRect();
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }

    window.addEventListener('resize', handleResize);
    // Initial fit
    setTimeout(handleResize, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <PhysicsProvider value={physics}>
      <div className="canvas-container" ref={containerRef}>
        {/* Matter.js injects its <canvas> here */}
      </div>
      {children}
    </PhysicsProvider>
  );
}
