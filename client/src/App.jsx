/**
 * client/src/App.jsx
 * ────────────────────────────────────────────────────────
 * Root application layout for VIRTUAL-LAB.
 * 
 * ARCHITECTURE: PhysicsCanvas creates the PhysicsProvider,
 * so all physics-dependent UI (toolbar, panels, modals)
 * must be CHILDREN of PhysicsCanvas to access context.
 * ────────────────────────────────────────────────────────
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
          }}>VIRTUAL-LAB</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Collaborative Physics Sandbox</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Enter your name to begin
          </label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alice" autoFocus minLength={2} maxLength={30}
            className="w-full px-4 py-3 rounded-lg text-sm font-medium outline-none"
            style={{ background: 'var(--color-surface-700)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--color-text-primary)' }} />
          <button type="submit" disabled={name.trim().length < 2}
            className="w-full mt-4 py-3 rounded-lg text-sm font-semibold"
            style={{
              background: name.trim().length >= 2 ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface-600)',
              color: name.trim().length >= 2 ? '#fff' : 'var(--color-text-muted)',
              cursor: name.trim().length >= 2 ? 'pointer' : 'not-allowed',
            }}>Launch Workspace</button>
        </form>
      </div>
    </div>
  );
}

/* ─── Onboarding Tutorial Overlay ─────────────────────── */
function TutorialOverlay({ onDismiss }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: '🎉 Welcome to VIRTUAL-LAB!',
      text: 'This is a collaborative 2D physics sandbox. You can build machines, test structures, and explore physics with others in real-time.',
      highlight: null,
    },
    {
      title: '🔷 Spawn Bodies',
      text: 'Use the SPAWN toolbar to add rectangles, circles, triangles, and static platforms. They\'ll fall under gravity and collide with each other!',
      highlight: 'spawn',
    },
    {
      title: '🔗 Create Constraints',
      text: 'Use CONNECT tools to link bodies with pins (rigid), springs (bouncy), ropes (flexible), or motors (rotating). Click two bodies to connect them.',
      highlight: 'connect',
    },
    {
      title: '📊 Watch Analytics',
      text: 'Click the ANALYTICS bar at the bottom to see live charts of kinetic energy, speed, and collision forces.',
      highlight: 'analytics',
    },
    {
      title: '📚 Experiment Library',
      text: 'Click Library in the header to browse pre-built physics scenarios. Load them to see pendulums, bridges, chain reactions, and more!',
      highlight: 'library',
    },
    {
      title: '✏️ Edit Properties',
      text: 'Right-click or click any body to select it. A properties panel will appear where you can change density, friction, bounce, color, and more.',
      highlight: 'properties',
    },
  ];

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-card glass-panel glow-indigo animate-fade-in">
        <div className="tutorial-step-indicator">
          {steps.map((_, i) => (
            <div key={i} className={`tutorial-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
          ))}
        </div>
        <h3 className="tutorial-title">{currentStep.title}</h3>
        <p className="tutorial-text">{currentStep.text}</p>
        <div className="tutorial-actions">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="tutorial-btn-secondary">Back</button>
          )}
          <button onClick={() => isLast ? onDismiss() : setStep(s => s + 1)}
            className="tutorial-btn-primary">
            {isLast ? 'Start Building! 🚀' : 'Next →'}
          </button>
        </div>
        <button onClick={onDismiss} className="tutorial-skip">Skip tutorial</button>
      </div>
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
              {isConnected ? 'Connected' : 'Offline (start backend)'}
            </span>
          </div>
          {!isInRoom ? (
            <>
              <button disabled={!isConnected}
                onClick={() => emit('room:create', {}, (res) => { if (res.success) joinRoom(res.roomCode, res.participants); })}
                className="w-full py-2 rounded-lg text-sm font-semibold mb-3"
                style={{ background: isConnected ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface-600)', color: isConnected ? '#fff' : 'var(--color-text-muted)' }}>
                Create Room
              </button>
              <div className="flex gap-2">
                <input type="text" value={joinInput} onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                  placeholder="Room Code" maxLength={6}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-mono outline-none"
                  style={{ background: 'var(--color-surface-700)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--color-text-primary)' }} />
                <button onClick={() => {
                  if (!joinInput.trim()) return;
                  emit('room:join', { roomCode: joinInput.trim() }, (res) => { if (res.success) joinRoom(res.roomCode, res.participants); });
                }} className="px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: 'rgba(34,211,238,0.15)', color: 'var(--color-accent-cyan)', border: '1px solid rgba(34,211,238,0.3)' }}>Join</button>
              </div>
            </>
          ) : (
            <div>
              <span className="text-lg font-mono font-bold" style={{ color: 'var(--color-accent-cyan)' }}>{roomCode}</span>
              <button onClick={() => { emit('room:leave'); leaveRoom(); }}
                className="ml-2 px-3 py-1 rounded text-xs font-semibold"
                style={{ background: 'rgba(244,63,94,0.15)', color: 'var(--color-accent-rose)' }}>Leave</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   WorkspaceInner — INSIDE PhysicsProvider
   All physics-dependent UI lives here.
   ═══════════════════════════════════════════════════════ */
function WorkspaceInner({ username }) {
  const physics = usePhysics();
  const selection = useSelection();
  const constraintMode = useConstraintMode(physics.addConstraint);
  const telemetry = usePhysicsTelemetry(physics.engineRef);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showLibrary, setShowLibrary]     = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVectors, setShowVectors]     = useState(false);
  const [showTutorial, setShowTutorial]   = useState(true);
  const demoSpawned = useRef(false);

  // ESC handler
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

  // Spawn a demo scene on first load so the canvas isn't empty
  useEffect(() => {
    if (demoSpawned.current || !physics.engineRef.current) return;
    demoSpawned.current = true;

    // Give the engine a moment to initialize
    setTimeout(() => {
      // Create a ramp
      physics.addBody('platform', { x: 350, y: 300, width: 250, height: 14, options: { angle: 0.3 } });
      // Create a platform to catch things
      physics.addBody('platform', { x: 700, y: 500, width: 200, height: 14 });

      // Drop some bodies
      setTimeout(() => {
        physics.addBody('circle', { x: 250, y: 120, color: '#6366f1', radius: 22 });
        setTimeout(() => {
          physics.addBody('rectangle', { x: 310, y: 80, color: '#f43f5e', width: 35, height: 35 });
          setTimeout(() => {
            physics.addBody('triangle', { x: 280, y: 40, color: '#22d3ee', size: 45 });
            setTimeout(() => {
              physics.addBody('circle', { x: 350, y: 60, color: '#10b981', radius: 18 });
            }, 400);
          }, 400);
        }, 400);
      }, 300);
    }, 500);
  }, [physics.engineRef.current]);

  // Handle canvas click — for body selection + constraint mode
  const handleCanvasClick = useCallback((body, pos) => {
    if (!body) {
      selection.clearSelection();
      return;
    }
    // constraint mode takes priority
    if (constraintMode.isActive) {
      const created = constraintMode.handleBodyClick(body);
      if (!created) selection.selectBody(body);
      return;
    }
    selection.selectBody(body);
  }, [constraintMode.isActive, constraintMode.handleBodyClick, selection]);

  // Load experiment from library
  const handleLoadExperiment = useCallback((worldState) => {
    if (!physics.engineRef.current) return;
    physics.reset();
    restoreWorld(physics.engineRef.current, worldState);
  }, [physics]);

  // Save experiment
  const handleSaveExperiment = useCallback((meta) => {
    if (!physics.engineRef.current) return;
    const ws = serializeWorld(physics.engineRef.current.world);
    console.log('[Save]', { ...meta, worldState: ws });
    alert(`✅ Experiment "${meta.title}" saved!\n\n(In production this would be sent to MongoDB via the REST API. Start the backend server to enable persistence.)`);
  }, [physics]);

  return (
    <>
      {/* ── Tutorial ─────────────────────────────── */}
      {showTutorial && <TutorialOverlay onDismiss={() => setShowTutorial(false)} />}

      {/* ── Header ───────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2 glass-panel-solid"
        style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 30 }}>
        <h1 className="text-lg font-bold tracking-tight" style={{
          background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>VIRTUAL-LAB</h1>
        <div className="flex items-center gap-2">
          <button className="header-action-btn" onClick={() => setShowVectors(v => !v)}>
            <Icons.Vectors /><span>{showVectors ? 'Hide' : 'Show'} Vectors</span>
          </button>
          <button className="header-action-btn" onClick={() => setShowLibrary(true)}>
            <Icons.Library /><span>Library</span>
          </button>
          <button className="header-action-btn" onClick={() => setShowSaveModal(true)}>
            <Icons.Save /><span>Save</span>
          </button>
          <button className="header-action-btn" onClick={() => setShowTutorial(true)}>
            <span>❓ Help</span>
          </button>
          <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{username}</span>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff' }}>
            {username[0].toUpperCase()}
          </div>
        </div>
      </header>

      {/* ── Toolbar ──────────────────────────────── */}
      <div className="glass-panel-solid flex items-center gap-2 px-3 py-2 animate-fade-in flex-wrap"
        style={{ position: 'absolute', top: 64, left: 12, zIndex: 20 }}>
        <span className="text-xs font-semibold mr-1" style={{ color: 'var(--color-text-muted)' }}>SPAWN</span>
        <button className="toolbar-btn" title="Add Rectangle"
          onClick={() => physics.addBody('rectangle', { x: 200 + Math.random() * 400, y: 80 + Math.random() * 80, color: randomBodyColor() })}>
          <Icons.Square />
        </button>
        <button className="toolbar-btn" title="Add Circle"
          onClick={() => physics.addBody('circle', { x: 200 + Math.random() * 400, y: 80 + Math.random() * 80, color: randomBodyColor() })}>
          <Icons.Circle />
        </button>
        <button className="toolbar-btn" title="Add Triangle"
          onClick={() => physics.addBody('triangle', { x: 200 + Math.random() * 400, y: 80 + Math.random() * 80, color: randomBodyColor() })}>
          <Icons.Triangle />
        </button>
        <button className="toolbar-btn" title="Add Static Platform"
          onClick={() => physics.addBody('platform', { x: 300 + Math.random() * 400, y: 200 + Math.random() * 200 })}>
          <Icons.Platform />
        </button>

        <div style={{ width: 1, height: 24, background: 'var(--color-surface-600)', margin: '0 4px' }} />

        <ConstraintTools
          activeTool={constraintMode.activeTool}
          phase={constraintMode.phase}
          onSelectTool={constraintMode.startMode}
          onCancel={constraintMode.cancel}
        />

        <div style={{ width: 1, height: 24, background: 'var(--color-surface-600)', margin: '0 4px' }} />

        <span className="text-xs font-semibold mr-1" style={{ color: 'var(--color-text-muted)' }}>SIM</span>
        <button className={`toolbar-btn ${physics.isRunning ? 'active' : ''}`}
          title={physics.isRunning ? 'Pause' : 'Resume'}
          onClick={() => physics.isRunning ? physics.pause() : physics.resume()}>
          {physics.isRunning ? <Icons.Pause /> : <Icons.Play />}
        </button>
        <button className="toolbar-btn" title="Clear All" onClick={() => { physics.reset(); demoSpawned.current = false; }}>
          <Icons.Trash />
        </button>
      </div>

      {/* ── Room Panel ───────────────────────────── */}
      <div style={{ position: 'absolute', top: 64, right: 12, zIndex: 20 }}>
        <RoomPanel username={username} />
      </div>

      {/* ── Properties Panel ─────────────────────── */}
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

      {/* ── Analytics Dashboard ──────────────────── */}
      <AnalyticsDashboard
        telemetry={telemetry.telemetry}
        bodyVectors={telemetry.bodyVectors}
        isOpen={showAnalytics}
        onToggle={() => setShowAnalytics(!showAnalytics)}
      />

      {/* ── Modals (INSIDE PhysicsProvider) ─────── */}
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

/* ═══════════════════════════════════════════════════════
   Main App
   ═══════════════════════════════════════════════════════ */
export default function App() {
  const [username, setUsername] = useState(null);
  const selection = useSelection();

  const handleCanvasClick = useCallback((body, pos) => {
    if (body) selection.selectBody(body);
    else selection.clearSelection();
  }, [selection]);

  if (!username) return <UsernameScreen onSubmit={setUsername} />;

  return (
    <RoomProvider>
      <div className="h-full w-full" style={{ background: 'var(--color-surface-900)' }}>
        <PhysicsCanvas
          width={1280} height={720}
          selectedBody={selection.selectedBody}
          bodyVectors={[]}
          showVectors={false}
          onCanvasClick={handleCanvasClick}
        >
          <WorkspaceInner username={username} />
        </PhysicsCanvas>
      </div>
    </RoomProvider>
  );
}
