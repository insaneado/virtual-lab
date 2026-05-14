/**
 * client/src/components/canvas/PhysicsCanvas.jsx
 * ────────────────────────────────────────────────────────
 * Mounts Matter.js renderer into the parent container
 * and wraps children with PhysicsProvider.
 * Click handling is done by WorkspaceInner (in App.jsx).
 * ────────────────────────────────────────────────────────
 */

import React, { useRef, useEffect } from 'react';
import usePhysicsEngine from '../../hooks/usePhysicsEngine.js';
import { PhysicsProvider } from '../../context/PhysicsContext.jsx';

export default function PhysicsCanvas({ children, width = 1280, height = 720 }) {
  const containerRef = useRef(null);

  const physics = usePhysicsEngine(containerRef, {
    width, height,
    gravity: { x: 0, y: 1 },
    wireframes: false,
    background: 'transparent',
  });

  // Make canvas fill container
  useEffect(() => {
    function resize() {
      const canvas = containerRef.current?.querySelector('canvas');
      if (canvas) { canvas.style.width = '100%'; canvas.style.height = '100%'; }
    }
    window.addEventListener('resize', resize);
    setTimeout(resize, 100);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <PhysicsProvider value={physics}>
      <div ref={containerRef} style={{ position:'absolute', inset:0 }}>
        {/* Matter.js injects <canvas> here */}
      </div>
      {children}
    </PhysicsProvider>
  );
}
