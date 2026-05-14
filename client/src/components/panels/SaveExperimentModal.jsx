/**
 * client/src/components/panels/SaveExperimentModal.jsx
 * ────────────────────────────────────────────────────────
 * Modal dialog for saving the current workspace as a
 * named experiment to the library.
 * ────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';

const CATEGORIES  = ['mechanics', 'structures', 'machines', 'custom'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

export default function SaveExperimentModal({ isOpen, onClose, onSave }) {
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory]     = useState('custom');
  const [difficulty, setDifficulty] = useState('beginner');
  const [tags, setTags]             = useState('');
  const [isPublic, setIsPublic]     = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim(),
      category,
      difficulty,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      isPublic,
    });

    // reset
    setTitle('');
    setDescription('');
    setCategory('custom');
    setDifficulty('beginner');
    setTags('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="library-overlay" onClick={onClose}>
      <div className="save-modal glass-panel animate-fade-in" onClick={e => e.stopPropagation()}>
        <h2 className="library-title" style={{ marginBottom: 16 }}>Save Experiment</h2>

        <form onSubmit={handleSubmit}>
          <div className="save-field">
            <label>Title *</label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Double Pendulum Chaos" maxLength={120} required
              className="save-input"
            />
          </div>

          <div className="save-field">
            <label>Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What does this experiment demonstrate?"
              rows={3} maxLength={2000}
              className="save-input"
            />
          </div>

          <div className="save-row">
            <div className="save-field" style={{ flex: 1 }}>
              <label>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="save-input">
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="save-field" style={{ flex: 1 }}>
              <label>Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="save-input">
                {DIFFICULTIES.map(d => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="save-field">
            <label>Tags (comma-separated)</label>
            <input
              type="text" value={tags} onChange={e => setTags(e.target.value)}
              placeholder="e.g. pendulum, chaos, gravity"
              className="save-input"
            />
          </div>

          <label className="prop-checkbox" style={{ marginBottom: 16 }}>
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
            <span>Make public (visible in library)</span>
          </label>

          <div className="save-actions">
            <button type="button" onClick={onClose} className="card-btn">Cancel</button>
            <button type="submit" disabled={!title.trim()} className="card-btn load-btn">
              Save Experiment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
