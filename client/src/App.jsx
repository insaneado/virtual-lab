/**
 * client/src/App.jsx
 * ────────────────────────────────────────────────────────
 * Root layout. PhysicsCanvas creates PhysicsProvider,
 * so ALL interactive logic lives in WorkspaceInner.
 * App only handles username login.
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
import { randomBodyColor, restoreWorld, serializeWorld } from './utils/matterHelpers.js';

/* ─── SVG Icons ─────────────────────────────────────── */
const I = {
  Sq:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>,
  Ci:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg>,
  Tr:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,3 22,21 2,21"/></svg>,
  Pl:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="10" width="20" height="4" rx="1"/></svg>,
  Play: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>,
  Paus: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  Del:  () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/></svg>,
  Usr:  () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17,21v-2a4,4,0,0,0-4-4H5a4,4,0,0,0-4,4v2"/><circle cx="9" cy="7" r="4"/><path d="M23,21v-2a4,4,0,0,0-3-3.87"/><path d="M16,3.13a4,4,0,0,1,0,7.75"/></svg>,
  Lib:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Sav:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19,21H5a2,2,0,0,1-2-2V5A2,2,0,0,1,5,3h11l5,5V19A2,2,0,0,1,19,21Z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>,
  Vec:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="15,8 19,12 15,16"/></svg>,
};

/* ─── Login Screen ──────────────────────────────────── */
function LoginScreen({ onSubmit }) {
  const [name, setName] = useState('');
  return (
    <div className="flex items-center justify-center h-full w-full" style={{ background: 'var(--color-surface-900)' }}>
      <div className="glass-panel glow-indigo p-8 animate-fade-in" style={{ width: 420 }}>
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2" style={{ background:'linear-gradient(135deg,#6366f1,#22d3ee)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>VIRTUAL-LAB</h1>
          <p className="text-sm" style={{ color:'var(--color-text-secondary)' }}>Collaborative Physics Sandbox</p>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (name.trim().length >= 2) onSubmit(name.trim()); }}>
          <label className="block text-sm font-medium mb-2" style={{ color:'var(--color-text-secondary)' }}>Enter your name to begin</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alice" autoFocus minLength={2} maxLength={30}
            className="w-full px-4 py-3 rounded-lg text-sm font-medium outline-none"
            style={{ background:'var(--color-surface-700)', border:'1px solid rgba(99,102,241,0.2)', color:'var(--color-text-primary)' }}/>
          <button type="submit" disabled={name.trim().length < 2} className="w-full mt-4 py-3 rounded-lg text-sm font-semibold"
            style={{ background: name.trim().length >= 2 ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'var(--color-surface-600)', color: name.trim().length >= 2 ? '#fff' : 'var(--color-text-muted)', cursor: name.trim().length >= 2 ? 'pointer' : 'not-allowed' }}>
            Launch Workspace
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Tutorial Overlay ──────────────────────────────── */
function Tutorial({ onDismiss }) {
  const [step, setStep] = useState(0);
  const steps = [
    { t: '🎉 Welcome to VIRTUAL-LAB!', d: 'A collaborative 2D physics sandbox. Build machines, test structures, and explore physics with others in real-time.' },
    { t: '🔷 Spawn Bodies', d: 'Use the SPAWN toolbar to add rectangles, circles, triangles, and static platforms. They fall under gravity and collide!' },
    { t: '🔗 Create Constraints', d: 'Use CONNECT tools to link bodies with pins (rigid), springs (bouncy), ropes (flexible), or motors (rotating). Click two bodies to connect them.' },
    { t: '📊 Watch Analytics', d: 'Click ANALYTICS at the bottom for live charts of kinetic energy, speed, and forces. Toggle velocity vectors with the button in the header.' },
    { t: '📚 Experiment Library', d: 'Click Library to browse pre-built scenarios: pendulums, bridges, wrecking balls, and more. Click Load to try them!' },
    { t: '✏️ Edit Properties', d: 'Click any body on the canvas to select it. A properties panel appears on the right where you can change density, friction, bounce, and color.' },
  ];
  const s = steps[step];
  const last = step === steps.length - 1;
  return (
    <div className="tutorial-overlay">
      <div className="tutorial-card glass-panel glow-indigo animate-fade-in">
        <div className="tutorial-step-indicator">{steps.map((_, i) => <div key={i} className={`tutorial-dot ${i === step ? 'active' : i < step ? 'done' : ''}`}/>)}</div>
        <h3 className="tutorial-title">{s.t}</h3>
        <p className="tutorial-text">{s.d}</p>
        <div className="tutorial-actions">
          {step > 0 && <button onClick={() => setStep(v => v-1)} className="tutorial-btn-secondary">Back</button>}
          <button onClick={() => last ? onDismiss() : setStep(v => v+1)} className="tutorial-btn-primary">{last ? 'Start Building! 🚀' : 'Next →'}</button>
        </div>
        <button onClick={onDismiss} className="tutorial-skip">Skip tutorial</button>
      </div>
    </div>
  );
}

/* ─── Room Panel ────────────────────────────────────── */
function RoomPanel({ username }) {
  const { isConnected, emit, on } = useSocket(username);
  const { roomCode, isInRoom, participants, joinRoom, leaveRoom, updateParticipants } = useRoom();
  const [joinInput, setJoinInput] = useState('');
  const [show, setShow] = useState(false);
  useEffect(() => {
    const u1 = on('room:user-joined', d => updateParticipants(d.participants));
    const u2 = on('room:user-left', d => updateParticipants(d.participants));
    return () => { u1(); u2(); };
  }, [on, updateParticipants]);
  return (
    <div style={{ position:'absolute', top:64, right:12, zIndex:20 }}>
      <button className="toolbar-btn" onClick={() => setShow(!show)} title="Room"><I.Usr/></button>
      {show && (
        <div className="glass-panel-solid p-4 mt-2 animate-fade-in" style={{ width:280 }}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`status-dot ${isConnected?'connected':'disconnected'}`}/> 
            <span className="text-xs" style={{color:'var(--color-text-secondary)'}}>{isConnected?'Connected':'Offline (start backend)'}</span>
          </div>
          {!isInRoom ? (<>
            <button disabled={!isConnected} onClick={() => emit('room:create',{},(r)=>{if(r.success)joinRoom(r.roomCode,r.participants)})}
              className="w-full py-2 rounded-lg text-sm font-semibold mb-3" style={{background:isConnected?'linear-gradient(135deg,#6366f1,#4f46e5)':'var(--color-surface-600)',color:isConnected?'#fff':'var(--color-text-muted)'}}>Create Room</button>
            <div className="flex gap-2">
              <input type="text" value={joinInput} onChange={e=>setJoinInput(e.target.value.toUpperCase())} placeholder="Room Code" maxLength={6} className="flex-1 px-3 py-2 rounded-lg text-sm font-mono outline-none" style={{background:'var(--color-surface-700)',border:'1px solid rgba(99,102,241,0.2)',color:'var(--color-text-primary)'}}/>
              <button onClick={()=>{if(!joinInput.trim())return;emit('room:join',{roomCode:joinInput.trim()},(r)=>{if(r.success)joinRoom(r.roomCode,r.participants)})}} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{background:'rgba(34,211,238,0.15)',color:'var(--color-accent-cyan)',border:'1px solid rgba(34,211,238,0.3)'}}>Join</button>
            </div>
          </>) : (<div>
            <span className="text-lg font-mono font-bold" style={{color:'var(--color-accent-cyan)'}}>{roomCode}</span>
            <button onClick={()=>{emit('room:leave');leaveRoom()}} className="ml-2 px-3 py-1 rounded text-xs font-semibold" style={{background:'rgba(244,63,94,0.15)',color:'var(--color-accent-rose)'}}>Leave</button>
          </div>)}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   WorkspaceInner — INSIDE PhysicsProvider
   ALL interactive logic lives here.
   ═══════════════════════════════════════════════════════ */
function WorkspaceInner({ username, canvasRef }) {
  const physics = usePhysics();
  const selection = useSelection();
  const constraintMode = useConstraintMode(physics.addConstraint);
  const telemetry = usePhysicsTelemetry(physics.engineRef);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVectors, setShowVectors] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const demoSpawned = useRef(false);

  // ESC to cancel
  useEffect(() => {
    const onKey = e => { if (e.key==='Escape') { if(constraintMode.isActive) constraintMode.cancel(); else selection.clearSelection(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [constraintMode.isActive]);

  // Auto-spawn demo scene
  useEffect(() => {
    if (demoSpawned.current || !physics.engineRef.current) return;
    demoSpawned.current = true;
    setTimeout(() => {
      physics.addBody('platform', { x: 350, y: 300, width: 250, height: 14, options: { angle: 0.3 } });
      physics.addBody('platform', { x: 700, y: 500, width: 200, height: 14 });
      setTimeout(() => {
        physics.addBody('circle', { x: 250, y: 120, color: '#6366f1', radius: 22 });
        setTimeout(() => physics.addBody('rectangle', { x: 310, y: 80, color: '#f43f5e', width: 35, height: 35 }), 400);
        setTimeout(() => physics.addBody('triangle', { x: 280, y: 40, color: '#22d3ee', size: 45 }), 800);
        setTimeout(() => physics.addBody('circle', { x: 350, y: 60, color: '#10b981', radius: 18 }), 1200);
      }, 300);
    }, 500);
  }, [physics.engineRef.current]);

  // ── Canvas click: selection + constraint creation ──
  useEffect(() => {
    const el = canvasRef?.current;
    if (!el) return;
    function onClick(e) {
      if (e.target.closest('button, input, .glass-panel-solid, .glass-panel, .tutorial-overlay, .library-overlay, .header-action-btn')) return;
      const canvas = el.querySelector('canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (1280 / rect.width);
      const y = (e.clientY - rect.top) * (720 / rect.height);
      const body = physics.getBodyAtPosition(x, y);

      if (constraintMode.isActive) {
        if (body) constraintMode.handleBodyClick(body);
        return;
      }
      if (body) selection.selectBody(body);
      else selection.clearSelection();
    }
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [constraintMode.isActive, constraintMode.handleBodyClick, physics.getBodyAtPosition]);

  const handleLoad = useCallback((ws) => { physics.reset(); restoreWorld(physics.engineRef.current, ws); }, [physics]);
  const handleSave = useCallback((meta) => {
    const ws = serializeWorld(physics.engineRef.current.world);
    console.log('[Save]', { ...meta, worldState: ws });
    alert(`✅ "${meta.title}" saved! (Start backend + MongoDB for persistence)`);
  }, [physics]);

  return (<>
    {showTutorial && <Tutorial onDismiss={() => setShowTutorial(false)}/>}

    {/* Header */}
    <header className="flex items-center justify-between px-4 py-2 glass-panel-solid" style={{position:'absolute',top:12,left:12,right:12,zIndex:30}}>
      <h1 className="text-lg font-bold tracking-tight" style={{background:'linear-gradient(135deg,#6366f1,#22d3ee)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>VIRTUAL-LAB</h1>
      <div className="flex items-center gap-2">
        <button className="header-action-btn" onClick={()=>setShowVectors(v=>!v)}><I.Vec/><span>{showVectors?'Hide':'Show'} Vectors</span></button>
        <button className="header-action-btn" onClick={()=>setShowLibrary(true)}><I.Lib/><span>Library</span></button>
        <button className="header-action-btn" onClick={()=>setShowSaveModal(true)}><I.Sav/><span>Save</span></button>
        <button className="header-action-btn" onClick={()=>setShowTutorial(true)}><span>❓ Help</span></button>
        <span className="text-xs font-mono" style={{color:'var(--color-text-muted)'}}>{username}</span>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{background:'linear-gradient(135deg,#6366f1,#4f46e5)',color:'#fff'}}>{username[0].toUpperCase()}</div>
      </div>
    </header>

    {/* Toolbar */}
    <div className="glass-panel-solid flex items-center gap-2 px-3 py-2 animate-fade-in flex-wrap" style={{position:'absolute',top:64,left:12,zIndex:20}}>
      <span className="text-xs font-semibold mr-1" style={{color:'var(--color-text-muted)'}}>SPAWN</span>
      <button className="toolbar-btn" title="Rectangle" onClick={()=>physics.addBody('rectangle',{x:200+Math.random()*400,y:80+Math.random()*80,color:randomBodyColor()})}><I.Sq/></button>
      <button className="toolbar-btn" title="Circle" onClick={()=>physics.addBody('circle',{x:200+Math.random()*400,y:80+Math.random()*80,color:randomBodyColor()})}><I.Ci/></button>
      <button className="toolbar-btn" title="Triangle" onClick={()=>physics.addBody('triangle',{x:200+Math.random()*400,y:80+Math.random()*80,color:randomBodyColor()})}><I.Tr/></button>
      <button className="toolbar-btn" title="Platform" onClick={()=>physics.addBody('platform',{x:300+Math.random()*400,y:200+Math.random()*200})}><I.Pl/></button>
      <div style={{width:1,height:24,background:'var(--color-surface-600)',margin:'0 4px'}}/>
      <ConstraintTools activeTool={constraintMode.activeTool} phase={constraintMode.phase} onSelectTool={constraintMode.startMode} onCancel={constraintMode.cancel}/>
      <div style={{width:1,height:24,background:'var(--color-surface-600)',margin:'0 4px'}}/>
      <span className="text-xs font-semibold mr-1" style={{color:'var(--color-text-muted)'}}>SIM</span>
      <button className={`toolbar-btn ${physics.isRunning?'active':''}`} title={physics.isRunning?'Pause':'Resume'} onClick={()=>physics.isRunning?physics.pause():physics.resume()}>{physics.isRunning?<I.Paus/>:<I.Play/>}</button>
      <button className="toolbar-btn" title="Clear All" onClick={()=>{physics.reset();demoSpawned.current=false;}}><I.Del/></button>
    </div>

    <RoomPanel username={username}/>

    {/* Properties Panel — connected to THIS selection */}
    <PropertiesPanel selectedBody={selection.selectedBody} selectedConstraint={selection.selectedConstraint}
      onUpdateBody={physics.updateBody} onUpdateConstraint={physics.updateConstraint} onSetMotorSpeed={physics.setMotorSpeed}
      onRemoveBody={id=>{physics.removeBody(id);selection.clearSelection()}} onRemoveConstraint={id=>{physics.removeConstraint(id);selection.clearSelection()}} onClose={selection.clearSelection}/>

    {/* Analytics — connected to THIS telemetry */}
    <AnalyticsDashboard telemetry={telemetry.telemetry} bodyVectors={telemetry.bodyVectors} isOpen={showAnalytics} onToggle={()=>setShowAnalytics(!showAnalytics)}/>

    {/* Modals */}
    <ExperimentLibrary isOpen={showLibrary} onClose={()=>setShowLibrary(false)} onLoadExperiment={handleLoad}/>
    <SaveExperimentModal isOpen={showSaveModal} onClose={()=>setShowSaveModal(false)} onSave={handleSave}/>
  </>);
}

/* ═══════════════════════════════════════════════════════
   App — just login + canvas shell
   ═══════════════════════════════════════════════════════ */
export default function App() {
  const [username, setUsername] = useState(null);
  const canvasRef = useRef(null);

  if (!username) return <LoginScreen onSubmit={setUsername}/>;

  return (
    <RoomProvider>
      <div className="h-full w-full" style={{ background:'var(--color-surface-900)' }}>
        <div ref={canvasRef} style={{position:'relative',width:'100%',height:'100%',overflow:'hidden',borderRadius:12,border:'1px solid rgba(99,102,241,0.12)',background:'#0a0e17'}}>
          <PhysicsCanvas width={1280} height={720}>
            <WorkspaceInner username={username} canvasRef={canvasRef}/>
          </PhysicsCanvas>
        </div>
      </div>
    </RoomProvider>
  );
}
