/**
 * client/src/components/panels/ExperimentLibrary.jsx
 * ────────────────────────────────────────────────────────
 * Full-screen modal gallery for browsing, searching,
 * and loading saved physics experiments.
 * ────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import ExperimentCard from './ExperimentCard.jsx';

const CATEGORIES  = ['all', 'mechanics', 'structures', 'machines', 'custom'];
const DIFFICULTIES = ['all', 'beginner', 'intermediate', 'advanced'];

// Demo experiments for when backend isn't running
const DEMO_EXPERIMENTS = [
  {
    _id: 'demo-1', title: 'Simple Pendulum',
    description: 'A ball swinging under gravity. Classic harmonic motion demo.',
    category: 'mechanics', difficulty: 'beginner', tags: ['pendulum', 'gravity'],
    forkCount: 12, thumbnail: '',
    worldState: { gravity: { x: 0, y: 1 }, bodies: [
      { bodyType: 'circle', position: { x: 640, y: 300 }, dimensions: { radius: 20 }, isStatic: false, material: { density: 0.004, friction: 0.01, restitution: 0.3 }, render: { fillStyle: '#6366f1', strokeStyle: '#4f46e5', lineWidth: 2 } },
    ], constraints: [] },
  },
  {
    _id: 'demo-2', title: 'Bridge Stress Test',
    description: 'Three platforms connected by springs. Drop objects to test integrity.',
    category: 'structures', difficulty: 'intermediate', tags: ['bridge', 'springs'],
    forkCount: 8, thumbnail: '',
    worldState: { gravity: { x: 0, y: 1 }, bodies: [
      { bodyType: 'rectangle', position: { x: 400, y: 400 }, dimensions: { width: 160, height: 14 }, isStatic: true, render: { fillStyle: '#334155', strokeStyle: '#475569', lineWidth: 2 } },
      { bodyType: 'rectangle', position: { x: 640, y: 400 }, dimensions: { width: 160, height: 14 }, isStatic: true, render: { fillStyle: '#334155', strokeStyle: '#475569', lineWidth: 2 } },
    ], constraints: [] },
  },
  {
    _id: 'demo-3', title: 'Gear Train',
    description: 'Motor-driven wheels demonstrating rotational energy transfer.',
    category: 'machines', difficulty: 'advanced', tags: ['motor', 'gears'],
    forkCount: 5, thumbnail: '',
    worldState: { gravity: { x: 0, y: 1 }, bodies: [
      { bodyType: 'circle', position: { x: 500, y: 360 }, dimensions: { radius: 40 }, isStatic: false, material: { density: 0.002, friction: 0.8, restitution: 0.1 }, render: { fillStyle: '#f59e0b', strokeStyle: '#d97706', lineWidth: 2 } },
    ], constraints: [] },
  },
  {
    _id: 'demo-4', title: 'Newton\'s Cradle',
    description: 'Five pendulums demonstrating conservation of momentum.',
    category: 'mechanics', difficulty: 'intermediate', tags: ['newton', 'momentum'],
    forkCount: 21, thumbnail: '',
    worldState: { gravity: { x: 0, y: 1 }, bodies: [
      { bodyType: 'circle', position: { x: 580, y: 400 }, dimensions: { radius: 18 }, isStatic: false, material: { density: 0.004, friction: 0.01, restitution: 0.99 }, render: { fillStyle: '#6366f1', strokeStyle: '#4f46e5', lineWidth: 2 } },
      { bodyType: 'circle', position: { x: 620, y: 400 }, dimensions: { radius: 18 }, isStatic: false, material: { density: 0.004, friction: 0.01, restitution: 0.99 }, render: { fillStyle: '#22d3ee', strokeStyle: '#06b6d4', lineWidth: 2 } },
    ], constraints: [] },
  },
  {
    _id: 'demo-5', title: 'Rube Goldberg Starter',
    description: 'Starting template for chain-reaction machines.',
    category: 'machines', difficulty: 'beginner', tags: ['chain-reaction', 'fun'],
    forkCount: 34, thumbnail: '',
    worldState: { gravity: { x: 0, y: 1 }, bodies: [
      { bodyType: 'circle', position: { x: 220, y: 250 }, dimensions: { radius: 15 }, isStatic: false, material: { density: 0.004, friction: 0.05, restitution: 0.6 }, render: { fillStyle: '#f43f5e', strokeStyle: '#e11d48', lineWidth: 2 } },
    ], constraints: [] },
  },
  {
    _id: 'demo-6', title: 'Spring Mass System',
    description: 'Explore damped harmonic motion with adjustable parameters.',
    category: 'mechanics', difficulty: 'advanced', tags: ['spring', 'damping'],
    forkCount: 15, thumbnail: '',
    worldState: { gravity: { x: 0, y: 1 }, bodies: [
      { bodyType: 'circle', position: { x: 640, y: 350 }, dimensions: { radius: 25 }, isStatic: false, material: { density: 0.005, friction: 0.01, restitution: 0.2 }, render: { fillStyle: '#10b981', strokeStyle: '#059669', lineWidth: 2 } },
    ], constraints: [] },
  },
];

export default function ExperimentLibrary({ isOpen, onClose, onLoadExperiment }) {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState('all');
  const [difficulty, setDifficulty]   = useState('all');
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);

  const fetchExperiments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (category !== 'all') params.set('category', category);
      if (difficulty !== 'all') params.set('difficulty', difficulty);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/experiments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setExperiments(data.experiments || []);
        setTotalPages(data.pagination?.pages || 1);
      } else {
        setExperiments(DEMO_EXPERIMENTS);
      }
    } catch {
      setExperiments(DEMO_EXPERIMENTS);
    }
    setLoading(false);
  }, [page, category, difficulty, search]);

  useEffect(() => {
    if (isOpen) fetchExperiments();
  }, [isOpen, fetchExperiments]);

  const handleLoad = (experiment) => {
    if (experiment.worldState) {
      onLoadExperiment(experiment.worldState);
      onClose();
    }
  };

  const handleFork = (experiment) => {
    alert(`Fork of "${experiment.title}" — requires authentication to save.`);
  };

  if (!isOpen) return null;

  return (
    <div className="library-overlay" onClick={onClose}>
      <div className="library-modal glass-panel animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="library-header">
          <div>
            <h2 className="library-title">Experiment Library</h2>
            <p className="library-subtitle">Browse, load, and fork physics scenarios</p>
          </div>
          <button className="toolbar-btn" onClick={onClose} style={{ width: 32, height: 32 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="library-filters">
          <div className="search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Search experiments..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="filter-group">
            {CATEGORIES.map(c => (
              <button key={c} className={`filter-chip ${category === c ? 'active' : ''}`}
                onClick={() => { setCategory(c); setPage(1); }}>
                {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
          <div className="filter-group">
            {DIFFICULTIES.map(d => (
              <button key={d} className={`filter-chip ${difficulty === d ? 'active' : ''}`}
                onClick={() => { setDifficulty(d); setPage(1); }}>
                {d === 'all' ? 'All Levels' : d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="library-grid">
          {loading ? (
            <div className="library-empty">Loading...</div>
          ) : experiments.length === 0 ? (
            <div className="library-empty">No experiments found.</div>
          ) : (
            experiments.map((exp, i) => (
              <ExperimentCard key={exp._id || i} experiment={exp} onLoad={handleLoad} onFork={handleFork} />
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="library-pagination">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="page-btn">← Prev</button>
            <span className="page-info">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="page-btn">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
