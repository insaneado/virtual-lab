/**
 * client/src/hooks/useConstraintMode.js
 * ────────────────────────────────────────────────────────
 * State machine for the two-click constraint creation UX.
 *
 * Flow:  IDLE → select tool → AWAITING_A → click body A
 *        → AWAITING_B → click body B → CREATE → IDLE
 *
 * Motor is a special case — it attaches to a single body,
 * so it skips the AWAITING_B phase entirely.
 * ────────────────────────────────────────────────────────
 */

import { useState, useCallback, useRef } from 'react';

const PHASES = {
  IDLE:       'idle',
  AWAITING_A: 'awaiting_a',
  AWAITING_B: 'awaiting_b',
};

export default function useConstraintMode(addConstraint) {
  const [activeTool, setActiveTool] = useState(null);   // null | pin | spring | rope | motor
  const [phase, setPhase]           = useState(PHASES.IDLE);
  const bodyARef                    = useRef(null);

  const startMode = useCallback((toolType) => {
    setActiveTool(toolType);
    setPhase(PHASES.AWAITING_A);
    bodyARef.current = null;
  }, []);

  const cancel = useCallback(() => {
    setActiveTool(null);
    setPhase(PHASES.IDLE);
    bodyARef.current = null;
  }, []);

  /**
   * Call this when the user clicks a body on the canvas.
   * Returns true if the constraint was created (so the
   * caller can clear selection state if needed).
   */
  const handleBodyClick = useCallback((body) => {
    if (!activeTool || !body) return false;

    if (phase === PHASES.AWAITING_A) {
      bodyARef.current = body;

      // motor only needs one body
      if (activeTool === 'motor') {
        addConstraint('motor', body, null, { motorSpeed: 0.05 });
        setActiveTool(null);
        setPhase(PHASES.IDLE);
        bodyARef.current = null;
        return true;
      }

      setPhase(PHASES.AWAITING_B);
      return false;
    }

    if (phase === PHASES.AWAITING_B) {
      // can't connect a body to itself
      if (body.id === bodyARef.current?.id) return false;

      addConstraint(activeTool, bodyARef.current, body);

      // reset
      setActiveTool(null);
      setPhase(PHASES.IDLE);
      bodyARef.current = null;
      return true;
    }

    return false;
  }, [activeTool, phase, addConstraint]);

  return {
    activeTool,
    phase,
    bodyA: bodyARef.current,
    isActive: activeTool !== null,
    startMode,
    cancel,
    handleBodyClick,
    PHASES,
  };
}
