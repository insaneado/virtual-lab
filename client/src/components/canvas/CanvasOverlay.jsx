/**
 * client/src/components/canvas/CanvasOverlay.jsx
 * ────────────────────────────────────────────────────────
 * Transparent SVG layer on top of the physics canvas.
 * Renders selection highlights, constraint mode previews,
 * force/velocity vector arrows, and motor indicators.
 * ────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef, useState } from 'react';

const ARROW_SCALE = 8;   // velocity vector scaling factor
const ARROW_COLOR = 'rgba(34, 211, 238, 0.6)';
const SELECTION_COLOR = '#6366f1';
const BODY_A_COLOR = '#f59e0b';

export default function CanvasOverlay({
  containerRef,
  selectedBody,
  constraintMode,  // { activeTool, phase, bodyA }
  bodyVectors,
  showVectors,
}) {
  const svgRef = useRef(null);
  const [dims, setDims] = useState({ w: 1280, h: 720 });
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  // sync size with the canvas container
  useEffect(() => {
    function measure() {
      const el = containerRef?.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setDims({ w: rect.width, h: rect.height });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [containerRef]);

  // track mouse position for constraint preview line
  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;

    function onMove(e) {
      const rect = el.getBoundingClientRect();
      // scale mouse to the internal 1280x720 coordinate system
      const scaleX = 1280 / rect.width;
      const scaleY = 720 / rect.height;
      setMouse({
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      });
    }

    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, [containerRef]);

  const scaleX = dims.w / 1280;
  const scaleY = dims.h / 720;

  return (
    <svg
      ref={svgRef}
      className="canvas-overlay"
      viewBox={`0 0 1280 720`}
      preserveAspectRatio="none"
      style={{ width: dims.w, height: dims.h }}
    >
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={ARROW_COLOR} />
        </marker>
        <marker id="arrowhead-force" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="rgba(244, 63, 94, 0.6)" />
        </marker>
      </defs>

      {/* ─── Selection highlight ring ──────────────── */}
      {selectedBody && !constraintMode?.isActive && (
        <circle
          cx={selectedBody.position.x}
          cy={selectedBody.position.y}
          r={getBodyRadius(selectedBody) + 8}
          fill="none"
          stroke={SELECTION_COLOR}
          strokeWidth="2"
          strokeDasharray="4 3"
          className="selection-ring"
        />
      )}

      {/* ─── Constraint mode: Body A indicator ─────── */}
      {constraintMode?.phase === 'awaiting_b' && constraintMode.bodyA && (
        <>
          <circle
            cx={constraintMode.bodyA.position.x}
            cy={constraintMode.bodyA.position.y}
            r={getBodyRadius(constraintMode.bodyA) + 10}
            fill="none"
            stroke={BODY_A_COLOR}
            strokeWidth="2.5"
            className="pulse-ring"
          />
          {/* dashed preview line from A to cursor */}
          <line
            x1={constraintMode.bodyA.position.x}
            y1={constraintMode.bodyA.position.y}
            x2={mouse.x}
            y2={mouse.y}
            stroke={BODY_A_COLOR}
            strokeWidth="1.5"
            strokeDasharray="6 4"
            opacity="0.6"
          />
        </>
      )}

      {/* ─── Velocity vectors ──────────────────────── */}
      {showVectors && bodyVectors && bodyVectors.map(bv => {
        const len = Math.sqrt(bv.vx * bv.vx + bv.vy * bv.vy);
        if (len < 0.3) return null; // skip near-stationary
        return (
          <line
            key={`v-${bv.id}`}
            x1={bv.x}
            y1={bv.y}
            x2={bv.x + bv.vx * ARROW_SCALE}
            y2={bv.y + bv.vy * ARROW_SCALE}
            stroke={ARROW_COLOR}
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
            opacity="0.7"
          />
        );
      })}
    </svg>
  );
}

/**
 * Rough bounding radius for a body (for selection ring sizing).
 */
function getBodyRadius(body) {
  if (!body) return 20;
  if (body._bodyType === 'circle') {
    return body._dimensions?.radius || 25;
  }
  const w = body._dimensions?.width || 50;
  const h = body._dimensions?.height || 50;
  return Math.max(w, h) / 2;
}
