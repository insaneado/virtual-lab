/**
 * client/src/hooks/useSelection.js
 * ────────────────────────────────────────────────────────
 * Manages which body or constraint is currently selected
 * so the Properties Panel can display its editable fields.
 * ────────────────────────────────────────────────────────
 */

import { useState, useCallback } from 'react';

export default function useSelection() {
  const [selectedBody, setSelectedBody]           = useState(null);
  const [selectedConstraint, setSelectedConstraint] = useState(null);

  const selectBody = useCallback((body) => {
    setSelectedBody(body);
    setSelectedConstraint(null);
  }, []);

  const selectConstraint = useCallback((constraint) => {
    setSelectedConstraint(constraint);
    setSelectedBody(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedBody(null);
    setSelectedConstraint(null);
  }, []);

  return {
    selectedBody,
    selectedConstraint,
    selectBody,
    selectConstraint,
    clearSelection,
    hasSelection: selectedBody !== null || selectedConstraint !== null,
  };
}
