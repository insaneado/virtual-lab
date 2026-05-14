/**
 * client/src/components/panels/ExperimentCard.jsx
 * ────────────────────────────────────────────────────────
 * Gallery card for a single experiment in the library.
 * Shows thumbnail, title, author, tags, difficulty badge.
 * ────────────────────────────────────────────────────────
 */

import React from 'react';

const DIFFICULTY_COLORS = {
  beginner:     { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  intermediate: { bg: 'rgba(245, 158, 11, 0.15)',  color: '#f59e0b' },
  advanced:     { bg: 'rgba(244, 63, 94, 0.15)',   color: '#f43f5e' },
};

const CATEGORY_ICONS = {
  mechanics:   '⚙️',
  structures:  '🏗️',
  machines:    '🔧',
  custom:      '🧪',
};

export default function ExperimentCard({ experiment, onLoad, onFork }) {
  const diff = DIFFICULTY_COLORS[experiment.difficulty] || DIFFICULTY_COLORS.beginner;
  const icon = CATEGORY_ICONS[experiment.category] || '🧪';

  return (
    <div className="experiment-card glass-panel">
      {/* Thumbnail */}
      <div className="card-thumbnail">
        {experiment.thumbnail ? (
          <img src={experiment.thumbnail} alt={experiment.title} />
        ) : (
          <div className="card-placeholder">
            <span style={{ fontSize: 32 }}>{icon}</span>
          </div>
        )}
        <div className="card-category-badge">{icon} {experiment.category}</div>
      </div>

      {/* Body */}
      <div className="card-body">
        <h4 className="card-title">{experiment.title}</h4>
        <p className="card-desc">
          {experiment.description
            ? experiment.description.slice(0, 80) + (experiment.description.length > 80 ? '...' : '')
            : 'No description'}
        </p>

        {/* Tags */}
        {experiment.tags?.length > 0 && (
          <div className="card-tags">
            {experiment.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="card-tag">#{tag}</span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="card-footer">
          <div className="card-meta">
            <span className="difficulty-badge" style={{ background: diff.bg, color: diff.color }}>
              {experiment.difficulty}
            </span>
            {experiment.forkCount > 0 && (
              <span className="fork-count">🍴 {experiment.forkCount}</span>
            )}
          </div>
          <div className="card-actions">
            <button className="card-btn load-btn" onClick={() => onLoad(experiment)} title="Load experiment">
              Load
            </button>
            <button className="card-btn fork-btn" onClick={() => onFork(experiment)} title="Fork a copy">
              Fork
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
