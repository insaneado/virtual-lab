/**
 * client/src/components/canvas/PhysicsCanvas.jsx
 * ────────────────────────────────────────────────────────
 * The core workspace component. Mounts the Matter.js
 * renderer, handles resize, and layers the SVG overlay
 * for selection highlights and velocity vectors.
 * ────────────────────────────────────────────────────────
 */

import React, { useRef, useEffect } from 'react';
import usePhysicsEngine from '../../hooks/usePhysicsEngine.js';
import { PhysicsProvider } from '../../context/PhysicsContext.jsx';
import CanvasOverlay from './CanvasOverlay.jsx';

export default function PhysicsCanvas({
  children,
  width = 1280,
  height = 720,
  selectedBody,
  constraintMode,
  bodyVectors,
  showVectors,
  onCanvasClick,
}) {
  const containerRef = useRef(null);

  const physics = usePhysicsEngine(containerRef, {
    width,
    height,
    gravity: { x: 0, y: 1 },
    wireframes: false,
    background: 'transparent',
  });

  // Handle resize
  useEffect(() => {
    function handleResize() {
      const canvas = containerRef.current?.querySelector('canvas');
      if (!canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Canvas click handler for body selection + constraint mode
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onCanvasClick) return;

    function handleClick(e) {
      const rect = el.getBoundingClientRect();
      const scaleX = 1280 / rect.width;
      const scaleY = 720 / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const body = physics.getBodyAtPosition(x, y);
      onCanvasClick(body, { x, y });
    }

    el.addEventListener('click', handleClick);
    return () => el.removeEventListener('click', handleClick);
  }, [onCanvasClick, physics.getBodyAtPosition]);

  return (
    <PhysicsProvider value={physics}>
      <div
        className={`canvas-container ${constraintMode?.isActive ? 'constraint-cursor' : ''}`}
        ref={containerRef}
      >
        {/* Matter.js injects its <canvas> here */}
        <CanvasOverlay
          containerRef={containerRef}
          selectedBody={selectedBody}
          constraintMode={constraintMode}
          bodyVectors={bodyVectors}
          showVectors={showVectors}
        />
      </div>
      {children}
    </PhysicsProvider>
  );
}
