/**
 * client/src/components/canvas/PhysicsCanvas.jsx
 * ────────────────────────────────────────────────────────
 * Mounts the Matter.js renderer, fills the viewport,
 * handles resize, and layers the SVG overlay.
 * ────────────────────────────────────────────────────────
 */

import React, { useRef, useEffect, useCallback } from 'react';
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
  const onClickRef = useRef(onCanvasClick);
  onClickRef.current = onCanvasClick;

  const physics = usePhysicsEngine(containerRef, {
    width,
    height,
    gravity: { x: 0, y: 1 },
    wireframes: false,
    background: 'transparent',
  });

  const getBodyRef = useRef(physics.getBodyAtPosition);
  getBodyRef.current = physics.getBodyAtPosition;

  // Handle resize
  useEffect(() => {
    function handleResize() {
      const container = containerRef.current;
      const canvas = container?.querySelector('canvas');
      if (!canvas) return;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    }
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Canvas click handler — uses refs to avoid dependency churn
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleClick(e) {
      if (e.target.closest('.glass-panel-solid, .glass-panel, .toolbar-btn, .header-action-btn, button, input, .tutorial-overlay, .library-overlay')) return;

      const canvas = el.querySelector('canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = 1280 / rect.width;
      const scaleY = 720 / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const body = getBodyRef.current(x, y);
      if (onClickRef.current) onClickRef.current(body, { x, y });
    }

    el.addEventListener('click', handleClick);
    return () => el.removeEventListener('click', handleClick);
  }, []);

  return (
    <PhysicsProvider value={physics}>
      <div
        className={`canvas-wrapper ${constraintMode?.isActive ? 'constraint-cursor' : ''}`}
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          borderRadius: '12px',
          border: '1px solid rgba(99, 102, 241, 0.12)',
          background: '#0a0e17',
        }}
      >
        <CanvasOverlay
          containerRef={containerRef}
          selectedBody={selectedBody}
          constraintMode={constraintMode}
          bodyVectors={bodyVectors}
          showVectors={showVectors}
        />
        {children}
      </div>
    </PhysicsProvider>
  );
}
