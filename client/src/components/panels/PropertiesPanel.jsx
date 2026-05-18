import React, { memo, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import DOMPurify from 'dompurify';
import useCanvasStore from '../../stores/useCanvasStore.js';

const COLORS = ['#6366f1', '#22d3ee', '#10b981', '#f43f5e', '#f59e0b', '#14b8a6'];

function clean(value) {
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).slice(0, 80);
}

function PropertiesPanel({ body, onUpdate, onDelete, onClose }) {
  const watchedBodyIds = useCanvasStore((state) => state.watchedBodyIds);
  const toggleWatchedBody = useCanvasStore((state) => state.toggleWatchedBody);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!body) {
      setDraft(null);
      return;
    }
    setDraft({
      label: body.plugin?.virtualLab?.displayLabel || body.label,
      mass: body.mass,
      restitution: body.restitution,
      friction: body.friction,
      isStatic: body.isStatic,
      fillStyle: body.render.fillStyle,
    });
  }, [body]);

  if (!body || !draft) return null;

  const isWatched = watchedBodyIds.includes(body.label);

  function update(key, value) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onUpdate(body, { [key]: key === 'label' ? clean(value) : value });
  }

  return (
    <aside className="body-configurator">
      <header className="panel-header">
        <div>
          <span className="eyebrow">Body</span>
          <strong>{body.plugin?.virtualLab?.type || 'body'}</strong>
        </div>
        <div className="panel-actions">
          <button
            className={`icon-btn ${isWatched ? 'active' : ''}`}
            type="button"
            title="Pin body analytics"
            onClick={() => toggleWatchedBody(body.label)}
          >
            Pin
          </button>
          <button className="icon-btn" type="button" title="Close" onClick={onClose}>X</button>
        </div>
      </header>

      <label className="field">
        <span>Label</span>
        <input value={draft.label} onChange={(event) => update('label', event.target.value)} />
      </label>

      <label className="field">
        <span>Mass</span>
        <input
          type="number"
          min="0.1"
          step="0.1"
          value={Number(draft.mass).toFixed(2)}
          onChange={(event) => update('mass', Number(event.target.value))}
        />
      </label>

      <label className="field">
        <span>Restitution</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={draft.restitution}
          onChange={(event) => update('restitution', Number(event.target.value))}
        />
      </label>

      <label className="field">
        <span>Friction</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={draft.friction}
          onChange={(event) => update('friction', Number(event.target.value))}
        />
      </label>

      <label className="check-row">
        <input
          type="checkbox"
          checked={draft.isStatic}
          onChange={(event) => update('isStatic', event.target.checked)}
        />
        <span>Static</span>
      </label>

      <div className="field">
        <span>Fill Color</span>
        <div className="swatches">
          {COLORS.map((color) => (
            <button
              key={color}
              className={`swatch ${draft.fillStyle === color ? 'active' : ''}`}
              type="button"
              aria-label={color}
              style={{ background: color }}
              onClick={() => update('fillStyle', color)}
            />
          ))}
        </div>
      </div>

      <button className="danger-btn" type="button" onClick={() => onDelete(body)}>
        Delete
      </button>
    </aside>
  );
}

PropertiesPanel.propTypes = {
  body: PropTypes.object,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

PropertiesPanel.defaultProps = {
  body: null,
};

export default memo(PropertiesPanel);
