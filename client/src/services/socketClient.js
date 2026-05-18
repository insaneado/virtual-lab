import { io } from 'socket.io-client';
import useRoomStore from '../stores/useRoomStore.js';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

let socketInstance = null;

export function getSocket(token) {
  if (socketInstance) return socketInstance;

  socketInstance = io(SERVER_URL, {
    auth: token ? { token } : undefined,
    withCredentials: true,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 8000,
    randomizationFactor: 0.5,
  });

  socketInstance.on('connect', () => useRoomStore.getState().setConnection(true));
  socketInstance.on('disconnect', () => useRoomStore.getState().setConnection(false));
  socketInstance.on('connect_error', () => useRoomStore.getState().setConnection(false));
  socketInstance.on('cursor:move', (cursor) => useRoomStore.getState().setCursor(cursor));
  socketInstance.on('user:joined', (user) => useRoomStore.getState().addUser(user));
  socketInstance.on('user:left', (user) => useRoomStore.getState().removeUser(user.userId));

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export function peekSocket() {
  return socketInstance;
}
