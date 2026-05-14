/**
 * client/src/components/toolbar/ConstraintTools.jsx
 * ────────────────────────────────────────────────────────
 * Toolbar section for constraint creation.
 * Four buttons: Pin, Spring, Rope, Motor.
 * Active tool gets a highlighted state, plus a cancel btn.
 * ────────────────────────────────────────────────────────
 */

import React from 'react';

// inline svg icons — keeps the bundle dependency-free
const CIcons = {
  Pin: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="9" /><line x1="12" y1="15" x2="12" y2="22" />
    </svg>
  ),
  Spring: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4,12 6,6 10,18 14,6 18,18 20,12" />
    </svg>
  ),
  Rope: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2">
      <path d="M4,4 Q12,20 20,4" />
    </svg>
  ),
  Motor: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="6" /><path d="M12,6 L14,2" /><path d="M18,12 L22,10" /><path d="M12,18 L10,22" /><path d="M6,12 L2,14" />
    </svg>
  ),
  Cancel: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

const TOOLS = [
  { key: 'pin',    icon: CIcons.Pin,    label: 'Pin',    tip: 'Rigid joint — locks two bodies together' },
  { key: 'spring', icon: CIcons.Spring, label: 'Spring', tip: 'Elastic connection — bouncy link' },
  { key: 'rope',   icon: CIcons.Rope,   label: 'Rope',   tip: 'Flexible tether — max distance constraint' },
  { key: 'motor',  icon: CIcons.Motor,  label: 'Motor',  tip: 'Applies constant rotation to a body' },
];

export default function ConstraintTools({ activeTool, phase, onSelectTool, onCancel }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs font-semibold mr-1" style={{ color: 'var(--color-text-muted)' }}>CONNECT</span>

      {TOOLS.map(t => {
        const isActive = activeTool === t.key;
        return (
          <button
            key={t.key}
            className={`toolbar-btn ${isActive ? 'constraint-active' : ''}`}
            title={t.tip}
            onClick={() => isActive ? onCancel() : onSelectTool(t.key)}
          >
            <t.icon />
          </button>
        );
      })}

      {activeTool && (
        <>
          <button className="toolbar-btn cancel-btn" title="Cancel (Esc)" onClick={onCancel}>
            <CIcons.Cancel />
          </button>
          <span className="text-xs font-medium ml-1 constraint-status-text">
            {phase === 'awaiting_a' ? 'Click body A' : 'Click body B'}
          </span>
        </>
      )}
    </div>
  );
}
