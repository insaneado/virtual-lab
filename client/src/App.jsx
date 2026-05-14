/**
 * client/src/App.jsx
 * ────────────────────────────────────────────────────────
 * Root application layout for VIRTUAL-LAB.
 * Integrates all phases:
 *   Phase 2: Canvas + Toolbar + Room Panel
 *   Phase 3: Constraint tools + Properties Panel
 *   Phase 4: Analytics Dashboard
 *   Phase 5: Experiment Library + Save Modal
 * ────────────────────────────────────────────────────────
 */

import React, { useState, useCallback, useEffect } from 'react';
import PhysicsCanvas from './components/canvas/PhysicsCanvas.jsx';
import { usePhysics } from './context/PhysicsContext.jsx';
import { RoomProvider, useRoom } from './context/RoomContext.jsx';
import useSocket from './hooks/useSocket.js';
import useConstraintMode from './hooks/useConstraintMode.js';
import useSelection from './hooks/useSelection.js';
import usePhysicsTelemetry from './hooks/usePhysicsTelemetry.js';
import ConstraintTools from './components/toolbar/ConstraintTools.jsx';
import PropertiesPanel from './components/panels/PropertiesPanel.jsx';
import AnalyticsDashboard from './components/panels/AnalyticsDashboard.jsx';
import ExperimentLibrary from './components/panels/ExperimentLibrary.jsx';
import SaveExperimentModal from './components/panels/SaveExperimentModal.jsx';
import { randomBodyColor } from './utils/matterHelpers.js';
import { restoreWorld, serializeWorld } from './utils/matterHelpers.js';

/* ─── SVG Icons ───────────────────────────────────────── */
const Icons = {
  Square: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  ),
  Circle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  Triangle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12,3 22,21 2,21" />
    </svg>
  ),
  Platform: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="10" width="20" height="4" rx="1" />
    </svg>
  ),
  Play: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  ),
  Pause: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
    </svg>
  ),
  Trash: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" /><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2" />
    </svg>
  ),
  Users: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17,21v-2a4,4,0,0,0-4-4H5a4,4,0,0,0-4,4v2" /><circle cx="9" cy="7" r="4" /><path d="M23,21v-2a4,4,0,0,0-3-3.87" /><path d="M16,3.13a4,4,0,0,1,0,7.75" />
    </svg>
  ),
  Library: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Save: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19,21H5a2,2,0,0,1-2-2V5A2,2,0,0,1,5,3h11l5,5V19A2,2,0,0,1,19,21Z" />
      <polyline points="17,21 17,13 7,13 7,21" /><polyline points="7,3 7,8 15,8" />
    </svg>
  ),
  Vectors: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="15,8 19,12 15,16" />
    </svg>
  ),
};

/* ─── Username Entry Screen ───────────────────────────── */
function UsernameScreen({ onSubmit }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim().length >= 2) onSubmit(name.trim());
  };

  return (
    <div className="flex items-center justify-center h-full w-full" style={{ background: 'var(--color-surface-900)' }}>
      <div className="glass-panel glow-indigo p-8 animate-fade-in" style={{ width: '420px' }}>
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2" style={{
            background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            VIRTUAL-LAB
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Collaborative Physics Sandbox
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Enter your name to begin
          </label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alice" autoFocus minLength={2} maxLength={30}
            className="w-full px-4 py-3 rounded-lg text-sm font-medium outline-none transition-all duration-200"
            style={{
              background: 'var(--color-surface-700)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              color: 'var(--color-text-primary)',
            }}
          />
          <button type="submit" disabled={name.trim().length < 2}
            className="w-full mt-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200"
            style={{
              background: name.trim().length >= 2 ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface-600)',
              color: name.trim().length >= 2 ? '#fff' : 'var(--color-text-muted)',
              cursor: name.trim().length >= 2 ? 'pointer' : 'not-allowed',
            }}>
            Launch Workspace
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Toolbar (inside PhysicsProvider) ─────────────────── */
function Toolbar({ constraintMode, onConstraintTool, onCancelConstraint }) {
  const {
    addBody, isRunning, pause, resume, reset,
    addConstraint,
  } = usePhysics();

  return (
    <div
      className="glass-panel-solid flex items-center gap-2 px-3 py-2 animate-fade-in flex-wrap"
      style={{ position: 'absolute', top: 12, left: 12, zIndex: 20, maxWidth: 'calc(100% - 320px)' }}
    >
      <span className="text-xs font-semibold mr-1" style={{ color: 'var(--color-text-muted)' }}>SPAWN</span>

      <button className="toolbar-btn" title="Add Rectangle"
        onClick={() => addBody('rectangle', { x: 200 + Math.random() * 400, y: 80 + Math.random() * 100, color: randomBodyColor() })}>
        <Icons.Square />
      </button>
      <button className="toolbar-btn" title="Add Circle"
        onClick={() => addBody('circle', { x: 200 + Math.random() * 400, y: 80 + Math.random() * 100, color: randomBodyColor() })}>
        <Icons.Circle />
      </button>
      <button className="toolbar-btn" title="Add Triangle"
        onClick={() => addBody('triangle', { x: 200 + Math.random() * 400, y: 80 + Math.random() * 100, color: randomBodyColor() })}>
        <Icons.Triangle />
      </button>
      <button className="toolbar-btn" title="Add Static Platform"
        onClick={() => addBody('platform', { x: 300 + Math.random() * 400, y: 200 + Math.random() * 200 })}>
        <Icons.Platform />
      </button>

      <div style={{ width: 1, height: 24, background: 'var(--color-surface-600)', margin: '0 4px' }} />

      {/* Constraint tools */}
      <ConstraintTools
        activeTool={constraintMode.activeTool}
        phase={constraintMode.phase}
        onSelectTool={onConstraintTool}
        onCancel={onCancelConstraint}
      />

      <div style={{ width: 1, height: 24, background: 'var(--color-surface-600)', margin: '0 4px' }} />

      <span className="text-xs font-semibold mr-1" style={{ color: 'var(--color-text-muted)' }}>SIM</span>

      <button className={`toolbar-btn ${isRunning ? 'active' : ''}`}
        title={isRunning ? 'Pause' : 'Resume'}
        onClick={() => isRunning ? pause() : resume()}>
        {isRunning ? <Icons.Pause /> : <Icons.Play />}
      </button>
      <button className="toolbar-btn" title="Clear All" onClick={reset}>
        <Icons.Trash />
      </button>
    </div>
  );
}

/* ─── Room Panel ──────────────────────────────────────── */
function RoomPanel({ username }) {
  const { isConnected, emit, on } = useSocket(username);
  const { roomCode, isInRoom, participants, joinRoom, leaveRoom, updateParticipants } = useRoom();
  const [joinInput, setJoinInput] = useState('');
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const unsub1 = on('room:user-joined', (data) => updateParticipants(data.participants));
    const unsub2 = on('room:user-left', (data) => updateParticipants(data.participants));
    return () => { unsub1(); unsub2(); };
  }, [on, updateParticipants]);

  const handleCreate = () => {
    emit('room:create', {}, (res) => {
      if (res.success) joinRoom(res.roomCode, res.participants);
    });
  };

  const handleJoin = () => {
    if (!joinInput.trim()) return;
    emit('room:join', { roomCode: joinInput.trim().toUpperCase() }, (res) => {
      if (res.success) { joinRoom(res.roomCode, res.participants); setJoinInput(''); }
      else alert(res.error || 'Failed to join room');
    });
  };

  return (
    <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 20 }}>
      <button className="toolbar-btn" onClick={() => setShowPanel(!showPanel)} title="Room Controls">
        <Icons.Users />
      </button>

      {showPanel && (
        <div className="glass-panel-solid p-4 mt-2 animate-fade-in" style={{ width: 280 }}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            <span className="text-xs font-mono ml-auto" style={{ color: 'var(--color-text-muted)' }}>{username}</span>
          </div>

          {!isInRoom ? (
            <>
              <button onClick={handleCreate} disabled={!isConnected}
                className="w-full py-2 rounded-lg text-sm font-semibold mb-3 transition-all"
                style={{
                  background: isConnected ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface-600)',
                  color: isConnected ? '#fff' : 'var(--color-text-muted)',
                  cursor: isConnected ? 'pointer' : 'not-allowed',
                }}>
                Create Room
              </button>
              <div className="flex gap-2">
                <input type="text" value={joinInput} onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                  placeholder="Room Code" maxLength={6}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-mono outline-none"
                  style={{ background: 'var(--color-surface-700)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--color-text-primary)' }} />
                <button onClick={handleJoin} disabled={!isConnected || !joinInput.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: 'rgba(34,211,238,0.15)', color: 'var(--color-accent-cyan)', border: '1px solid rgba(34,211,238,0.3)' }}>
                  Join
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Room</span>
                  <span className="text-lg font-mono font-bold ml-2" style={{ color: 'var(--color-accent-cyan)' }}>{roomCode}</span>
                </div>
                <button onClick={() => { emit('room:leave'); leaveRoom(); }}
                  className="px-3 py-1 rounded text-xs font-semibold"
                  style={{ background: 'rgba(244,63,94,0.15)', color: 'var(--color-accent-rose)' }}>
                  Leave
                </button>
              </div>
              <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Participants ({participants.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {participants.map((p, i) => (
                  <span key={i} className="px-2 py-1 rounded text-xs"
                    style={{
                      background: p.role === 'host' ? 'rgba(99,102,241,0.15)' : 'rgba(30,41,59,0.8)',
                      color: p.role === 'host' ? 'var(--color-accent-indigo)' : 'var(--color-text-secondary)',
                    }}>
                    {p.username} {p.role === 'host' && '★'}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Inner Workspace (needs PhysicsProvider from canvas) */
function WorkspaceInner({ username }) {
  const physics = usePhysics();
  const selection = useSelection();
  const constraintMode = useConstraintMode(physics.addConstraint);
  const telemetry = usePhysicsTelemetry(physics.engineRef);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showLibrary, setShowLibrary]     = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVectors, setShowVectors]     = useState(false);

  // ESC to cancel constraint mode or clear selection
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        if (constraintMode.isActive) constraintMode.cancel();
        else selection.clearSelection();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [constraintMode.isActive]);

  // handle load experiment from library
  const handleLoadExperiment = useCallback((worldState) => {
    if (!physics.engineRef.current) return;
    physics.reset();
    restoreWorld(physics.engineRef.current, worldState);
  }, [physics]);

  // handle save experiment
  const handleSaveExperiment = useCallback((meta) => {
    if (!physics.engineRef.current) return;
    const worldState = serializeWorld(physics.engineRef.current.world);
    // for now just log it — saving requires auth + backend
    console.log('[Save] Experiment data:', { ...meta, worldState });
    alert(`Experiment "${meta.title}" prepared for save. Backend auth required to persist.`);
  }, [physics]);

  return (
    <>
      <Toolbar
        constraintMode={constraintMode}
        onConstraintTool={constraintMode.startMode}
        onCancelConstraint={constraintMode.cancel}
      />
      <RoomPanel username={username} />

      {/* Properties Panel */}
      <PropertiesPanel
        selectedBody={selection.selectedBody}
        selectedConstraint={selection.selectedConstraint}
        onUpdateBody={physics.updateBody}
        onUpdateConstraint={physics.updateConstraint}
        onSetMotorSpeed={physics.setMotorSpeed}
        onRemoveBody={(id) => { physics.removeBody(id); selection.clearSelection(); }}
        onRemoveConstraint={(id) => { physics.removeConstraint(id); selection.clearSelection(); }}
        onClose={selection.clearSelection}
      />

      {/* Analytics Dashboard */}
      <AnalyticsDashboard
        telemetry={telemetry.telemetry}
        bodyVectors={telemetry.bodyVectors}
        isOpen={showAnalytics}
        onToggle={() => setShowAnalytics(!showAnalytics)}
      />

      {/* Modals */}
      <ExperimentLibrary
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onLoadExperiment={handleLoadExperiment}
      />
      <SaveExperimentModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveExperiment}
      />
    </>
  );
}

/* ─── Main App ────────────────────────────────────────── */
export default function App() {
  const [username, setUsername] = useState(null);
  const [showLibrary, setShowLibrary]     = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVectors, setShowVectors]     = useState(false);

  // these need to be lifted out because PhysicsCanvas creates the provider
  const selection = useSelection();
  const constraintModeRef = React.useRef(null);

  // canvas click handler
  const handleCanvasClick = useCallback((body, pos) => {
    if (!body) {
      selection.clearSelection();
      return;
    }
    // if constraint mode is active, feed it to the state machine
    // (this is handled inside WorkspaceInner now via context)
    selection.selectBody(body);
  }, [selection]);

  if (!username) {
    return <UsernameScreen onSubmit={setUsername} />;
  }

  return (
    <RoomProvider>
      <div className="flex flex-col h-full w-full p-3 gap-3" style={{ background: 'var(--color-surface-900)' }}>
        {/* Header bar */}
        <header className="flex items-center justify-between px-4 py-2 glass-panel-solid">
          <h1 className="text-lg font-bold tracking-tight" style={{
            background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            VIRTUAL-LAB
          </h1>
          <div className="flex items-center gap-2">
            <button className="header-action-btn" onClick={() => setShowVectors(v => !v)}
              title="Toggle velocity vectors">
              <Icons.Vectors />
              <span>{showVectors ? 'Hide' : 'Show'} Vectors</span>
            </button>
            <button className="header-action-btn" onClick={() => setShowLibrary(true)}>
              <Icons.Library />
              <span>Library</span>
            </button>
            <button className="header-action-btn" onClick={() => setShowSaveModal(true)}>
              <Icons.Save />
              <span>Save</span>
            </button>
            <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{username}</span>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff' }}>
              {username[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Main workspace */}
        <div className="flex-1 relative" style={{ minHeight: 0 }}>
          <PhysicsCanvas
            width={1280} height={720}
            selectedBody={selection.selectedBody}
            bodyVectors={[]}
            showVectors={showVectors}
            onCanvasClick={handleCanvasClick}
          >
            <WorkspaceInner username={username} />
          </PhysicsCanvas>
        </div>

        {/* Library + Save modals (outside canvas) */}
        <ExperimentLibrary isOpen={showLibrary} onClose={() => setShowLibrary(false)}
          onLoadExperiment={(ws) => { console.log('Load from header:', ws); }} />
        <SaveExperimentModal isOpen={showSaveModal} onClose={() => setShowSaveModal(false)}
          onSave={(meta) => { console.log('Save from header:', meta); alert(`"${meta.title}" ready to save.`); }} />
      </div>
    </RoomProvider>
  );
}
