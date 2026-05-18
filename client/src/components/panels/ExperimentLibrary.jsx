import React, { memo, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import { Grid } from 'react-window';
import { experimentsAPI } from '../../services/api.js';
import ExperimentCard from './ExperimentCard.jsx';
import SaveExperimentModal from './SaveExperimentModal.jsx';

const TAGS = ['mechanics', 'energy', 'forces', 'pendulum', 'spring', 'structures'];

function VirtualCell({ columnIndex, rowIndex, style, experiments: items, onLoad, onShare }) {
  const experiment = items[rowIndex * 3 + columnIndex];
  if (!experiment) return null;
  return (
    <div style={{ ...style, padding: 8 }}>
      <ExperimentCard experiment={experiment} onLoad={onLoad} onShare={onShare} />
    </div>
  );
}

VirtualCell.propTypes = {
  columnIndex: PropTypes.number.isRequired,
  rowIndex: PropTypes.number.isRequired,
  style: PropTypes.object.isRequired,
  experiments: PropTypes.array.isRequired,
  onLoad: PropTypes.func.isRequired,
  onShare: PropTypes.func.isRequired,
};

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [delay, value]);
  return debounced;
}

function ExperimentLibrary({ open, onClose, currentSnapshot, onLoadExperiment, roomJoinLink }) {
  const [experiments, setExperiments] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const debouncedSearch = useDebounced(search, 300);
  const isCanvasDirty = Boolean(currentSnapshot?.bodies?.length || currentSnapshot?.constraints?.length);

  useEffect(() => {
    if (!open) return;
    async function fetchExperiments() {
      try {
        const data = await experimentsAPI.list({
          search: debouncedSearch,
          tags: selectedTags.join(','),
          limit: 80,
        });
        setExperiments(data.experiments || []);
      } catch (err) {
        toast.error(err.message);
      }
    }
    fetchExperiments();
  }, [debouncedSearch, open, selectedTags]);

  const visibleTags = useMemo(() => TAGS, []);

  async function saveExperiment(meta) {
    setSaving(true);
    try {
      const host = document.querySelector('.matter-host');
      const thumbnail = host
        ? (await html2canvas(host, { backgroundColor: '#0a0e17', scale: 0.5 })).toDataURL('image/png')
        : '';
      await experimentsAPI.create({
        ...meta,
        thumbnail,
        bodySnapshot: currentSnapshot?.bodies || [],
        constraintSnapshot: currentSnapshot?.constraints || [],
      });
      toast.success('Experiment saved.');
      setShowSave(false);
      const data = await experimentsAPI.list({ limit: 80 });
      setExperiments(data.experiments || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadExperiment(experiment) {
    try {
      if (isCanvasDirty && !window.confirm('Load this experiment and replace the current canvas?')) return;
      const full = experiment.bodySnapshot ? experiment : await experimentsAPI.get(experiment.id || experiment._id);
      onLoadExperiment({
        bodies: full.bodySnapshot || full.worldState?.bodies || [],
        constraints: full.constraintSnapshot || full.worldState?.constraints || [],
      });
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function shareExperiment() {
    try {
      await navigator.clipboard.writeText(roomJoinLink);
      toast.success('Room link copied.');
    } catch {
      toast.error('Could not copy room link.');
    }
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <section className="library-dialog">
        <header className="library-top">
          <div>
            <h2>Experiment Library</h2>
            <p>{experiments.length} templates</p>
          </div>
          <div className="library-actions">
            <button type="button" className="primary-btn" disabled={saving} onClick={() => setShowSave(true)}>
              Save Current Lab
            </button>
            <button type="button" className="icon-btn" onClick={onClose}>X</button>
          </div>
        </header>

        <div className="library-filters">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search experiments" />
          <div className="tag-row">
            {visibleTags.map((tag) => (
              <button
                key={tag}
                className={selectedTags.includes(tag) ? 'active' : ''}
                type="button"
                onClick={() => setSelectedTags((current) => (
                  current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
                ))}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {experiments.length > 50 ? (
          <Grid
            cellComponent={VirtualCell}
            cellProps={{
              experiments,
              onLoad: loadExperiment,
              onShare: shareExperiment,
            }}
            columnCount={3}
            columnWidth={320}
            defaultHeight={520}
            defaultWidth={1000}
            rowCount={Math.ceil(experiments.length / 3)}
            rowHeight={300}
            style={{ height: 520, width: '100%' }}
          />
        ) : (
          <div className="library-grid">
            {experiments.map((experiment) => (
              <ExperimentCard
                key={experiment.id || experiment._id}
                experiment={experiment}
                onLoad={loadExperiment}
                onShare={shareExperiment}
              />
            ))}
          </div>
        )}
      </section>
      <SaveExperimentModal open={showSave} onClose={() => setShowSave(false)} onSave={saveExperiment} />
    </div>
  );
}

ExperimentLibrary.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentSnapshot: PropTypes.object,
  onLoadExperiment: PropTypes.func.isRequired,
  roomJoinLink: PropTypes.string.isRequired,
};

ExperimentLibrary.defaultProps = {
  currentSnapshot: null,
};

export default memo(ExperimentLibrary);
