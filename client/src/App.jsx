import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import toast, { Toaster } from 'react-hot-toast';
import PhysicsCanvas from './components/canvas/PhysicsCanvas.jsx';
import ExperimentLibrary from './components/panels/ExperimentLibrary.jsx';
import { authAPI, roomsAPI } from './services/api.js';
import { disconnectSocket } from './services/socketClient.js';
import useAnalyticsStore from './stores/useAnalyticsStore.js';
import useRoomStore from './stores/useRoomStore.js';

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = mode === 'register'
        ? await authAPI.register(form)
        : await authAPI.login({ email: form.email, password: form.password });
      onAuthenticated(payload);
      toast.success('Welcome to VIRTUAL-LAB.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <h1>VIRTUAL-LAB</h1>
        <p>Collaborative 2D physics sandbox</p>
        {mode === 'register' && (
          <label className="field">
            <span>Username</span>
            <input
              value={form.username}
              minLength={3}
              maxLength={30}
              required
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            />
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            required
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={form.password}
            minLength={8}
            required
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />
        </label>
        <button className="primary-btn" disabled={loading} type="submit">
          {mode === 'register' ? 'Create Account' : 'Log In'}
        </button>
        <button className="link-btn" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Create an account' : 'Use existing account'}
        </button>
      </form>
    </main>
  );
}

AuthScreen.propTypes = {
  onAuthenticated: PropTypes.func.isRequired,
};

function Workspace({ auth, onLogout }) {
  const roomId = useRoomStore((state) => state.roomId);
  const joinCode = useRoomStore((state) => state.joinCode);
  const setRoom = useRoomStore((state) => state.setRoom);
  const clearRoom = useRoomStore((state) => state.clearRoom);
  const [joinInput, setJoinInput] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [currentSnapshot, setCurrentSnapshot] = useState({ bodies: [], constraints: [] });
  const [externalSnapshot, setExternalSnapshot] = useState(null);
  const roomJoinLink = useMemo(() => {
    if (!joinCode) return window.location.href;
    return `${window.location.origin}${window.location.pathname}?room=${joinCode}`;
  }, [joinCode]);

  useEffect(() => {
    const urlJoinCode = new URLSearchParams(window.location.search).get('room');
    if (urlJoinCode) setJoinInput(urlJoinCode.toUpperCase());
  }, []);

  async function createRoom() {
    try {
      const response = await roomsAPI.create({
        name: `${auth.user.username}'s Lab`,
        bodies: currentSnapshot.bodies,
        constraints: currentSnapshot.constraints,
      });
      setRoom({ roomId: response.roomId, joinCode: response.joinCode });
      toast.success('Room created.');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function joinRoom() {
    try {
      const response = await roomsAPI.get(joinInput.trim().toUpperCase());
      setRoom({ roomId: response.roomId, joinCode: response.joinCode });
      toast.success('Joined room.');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function logout() {
    try {
      await authAPI.logout();
    } finally {
      disconnectSocket();
      clearRoom();
      onLogout();
    }
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <div>
          <h1>VIRTUAL-LAB</h1>
          <span>{auth.user.username}</span>
        </div>
        <div className="room-controls">
          {roomId ? (
            <>
              <strong>{joinCode}</strong>
              <button type="button" onClick={() => navigator.clipboard.writeText(roomJoinLink).then(() => toast.success('Room link copied.'))}>
                Share
              </button>
            </>
          ) : (
            <>
              <button type="button" className="primary-btn" onClick={createRoom}>Create Room</button>
              <input
                value={joinInput}
                placeholder="Join code"
                maxLength={12}
                onChange={(event) => setJoinInput(event.target.value.toUpperCase())}
              />
              <button type="button" onClick={joinRoom}>Join</button>
            </>
          )}
          <button type="button" onClick={() => setLibraryOpen(true)}>Library</button>
          <button type="button" onClick={logout}>Logout</button>
        </div>
      </header>

      <PhysicsCanvas
        token={auth.token}
        roomId={roomId || ''}
        externalSnapshot={externalSnapshot}
        onSnapshotChange={setCurrentSnapshot}
      />

      <ExperimentLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        currentSnapshot={currentSnapshot}
        roomJoinLink={roomJoinLink}
        onLoadExperiment={(snapshot) => {
          useAnalyticsStore.getState().clear();
          setExternalSnapshot({ ...snapshot, loadedAt: Date.now() });
        }}
      />
    </main>
  );
}

Workspace.propTypes = {
  auth: PropTypes.shape({
    token: PropTypes.string,
    user: PropTypes.shape({
      username: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default function App() {
  const [auth, setAuth] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await authAPI.me();
        setAuth({ user: response.user, token: '' });
      } catch {
        setAuth(null);
      } finally {
        setChecking(false);
      }
    }
    loadUser();
  }, []);

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: '#111827', color: '#f8fafc' } }} />
      {checking ? (
        <main className="auth-screen"><div className="auth-card"><h1>VIRTUAL-LAB</h1></div></main>
      ) : auth ? (
        <Workspace auth={auth} onLogout={() => setAuth(null)} />
      ) : (
        <AuthScreen onAuthenticated={setAuth} />
      )}
    </>
  );
}
