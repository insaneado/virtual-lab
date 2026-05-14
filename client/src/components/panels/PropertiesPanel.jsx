/**
 * client/src/components/panels/PropertiesPanel.jsx
 * ────────────────────────────────────────────────────────
 * Floating side panel that shows when a body or constraint
 * is selected. Live-edits properties on the Matter.js engine.
 * ────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';

// ─── tiny slider component ──────────────────────────
function PropSlider({ label, value, min, max, step, unit, onChange }) {
  return (
    <div className="prop-row">
      <div className="prop-label">
        <span>{label}</span>
        <span className="prop-value">{typeof value === 'number' ? value.toFixed(step < 1 ? 3 : 1) : value}{unit || ''}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="prop-slider"
      />
    </div>
  );
}

// ─── color swatch selector ──────────────────────────
const PALETTE = [
  '#6366f1','#8b5cf6','#a855f7','#22d3ee','#06b6d4',
  '#10b981','#34d399','#f43f5e','#fb7185','#f59e0b',
  '#fbbf24','#e11d48','#0ea5e9','#14b8a6','#d97706',
];

function ColorPicker({ current, onChange }) {
  return (
    <div className="prop-row">
      <span className="prop-label"><span>Color</span></span>
      <div className="color-grid">
        {PALETTE.map(c => (
          <button
            key={c}
            className={`color-swatch ${current === c ? 'active' : ''}`}
            style={{ background: c }}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
    </div>
  );
}

export default function PropertiesPanel({
  selectedBody,
  selectedConstraint,
  onUpdateBody,
  onUpdateConstraint,
  onSetMotorSpeed,
  onRemoveBody,
  onRemoveConstraint,
  onClose,
}) {
  // local state mirrors the body/constraint for controlled inputs
  const [bodyProps, setBodyProps] = useState({});
  const [constraintProps, setConstraintProps] = useState({});

  // sync local state when selection changes
  useEffect(() => {
    if (selectedBody) {
      setBodyProps({
        density: selectedBody.density || 0.001,
        friction: selectedBody.friction || 0.1,
        restitution: selectedBody.restitution || 0.3,
        isStatic: selectedBody.isStatic || false,
        fillStyle: selectedBody.render?.fillStyle || '#6366f1',
        motorSpeed: selectedBody._motorSpeed || 0,
        hasMotor: selectedBody._hasMotor || false,
      });
    }
  }, [selectedBody?.id]);

  useEffect(() => {
    if (selectedConstraint) {
      setConstraintProps({
        stiffness: selectedConstraint.stiffness || 0,
        damping: selectedConstraint.damping || 0,
        length: selectedConstraint.length || 0,
      });
    }
  }, [selectedConstraint?.id]);

  // ─── body property change handler ─────────────────
  function handleBodyChange(key, val) {
    setBodyProps(prev => ({ ...prev, [key]: val }));
    if (selectedBody) {
      if (key === 'motorSpeed') {
        onSetMotorSpeed(selectedBody.id, val);
      } else {
        onUpdateBody(selectedBody.id, { [key]: val });
      }
    }
  }

  // ─── constraint property change handler ───────────
  function handleConstraintChange(key, val) {
    setConstraintProps(prev => ({ ...prev, [key]: val }));
    if (selectedConstraint) {
      onUpdateConstraint(selectedConstraint.id, { [key]: val });
    }
  }

  if (!selectedBody && !selectedConstraint) return null;

  return (
    <div className="properties-panel glass-panel-solid animate-fade-in">
      {/* Header */}
      <div className="props-header">
        <h3 className="props-title">
          {selectedBody
            ? `${(selectedBody._bodyType || 'body').toUpperCase()} #${selectedBody.id}`
            : `${(selectedConstraint._constraintType || 'constraint').toUpperCase()} #${selectedConstraint.id}`
          }
        </h3>
        <button className="toolbar-btn" style={{ width: 28, height: 28 }} onClick={onClose} title="Close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="props-body">
        {/* ─── Body properties ─────────────────────── */}
        {selectedBody && (
          <>
            <div className="props-section-label">Material</div>

            <PropSlider
              label="Density" value={bodyProps.density}
              min={0.0001} max={0.05} step={0.0001} unit=""
              onChange={v => handleBodyChange('density', v)}
            />
            <PropSlider
              label="Friction" value={bodyProps.friction}
              min={0} max={1} step={0.01}
              onChange={v => handleBodyChange('friction', v)}
            />
            <PropSlider
              label="Bounce" value={bodyProps.restitution}
              min={0} max={1} step={0.01}
              onChange={v => handleBodyChange('restitution', v)}
            />

            <div className="prop-row">
              <label className="prop-checkbox">
                <input
                  type="checkbox"
                  checked={bodyProps.isStatic}
                  onChange={e => handleBodyChange('isStatic', e.target.checked)}
                />
                <span>Static (immovable)</span>
              </label>
            </div>

            <div className="props-section-label" style={{ marginTop: 8 }}>Appearance</div>
            <ColorPicker
              current={bodyProps.fillStyle}
              onChange={c => handleBodyChange('fillStyle', c)}
            />

            {bodyProps.hasMotor && (
              <>
                <div className="props-section-label" style={{ marginTop: 8 }}>Motor</div>
                <PropSlider
                  label="Speed" value={bodyProps.motorSpeed}
                  min={-0.3} max={0.3} step={0.005} unit=" rad/f"
                  onChange={v => handleBodyChange('motorSpeed', v)}
                />
              </>
            )}

            <button className="delete-btn" onClick={() => onRemoveBody(selectedBody.id)}>
              Delete Body
            </button>
          </>
        )}

        {/* ─── Constraint properties ───────────────── */}
        {selectedConstraint && (
          <>
            <div className="props-section-label">Physics</div>

            <PropSlider
              label="Stiffness" value={constraintProps.stiffness}
              min={0.001} max={1} step={0.001}
              onChange={v => handleConstraintChange('stiffness', v)}
            />
            <PropSlider
              label="Damping" value={constraintProps.damping}
              min={0} max={0.5} step={0.005}
              onChange={v => handleConstraintChange('damping', v)}
            />
            <PropSlider
              label="Length" value={constraintProps.length}
              min={0} max={400} step={1} unit="px"
              onChange={v => handleConstraintChange('length', v)}
            />

            <button className="delete-btn" onClick={() => onRemoveConstraint(selectedConstraint.id)}>
              Delete Constraint
            </button>
          </>
        )}
      </div>
    </div>
  );
}
