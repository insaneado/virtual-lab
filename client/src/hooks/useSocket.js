/**
 * client/src/hooks/useSocket.js
 * ────────────────────────────────────────────────────────
 * Thin wrapper around the socket singleton that gives
 * React components reactive connection state and a
 * clean event subscription API.
 * ────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, disconnectSocket, peekSocket } from '../services/socketClient.js';

export default function useSocket(username) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!username) return;

    const socket = getSocket(username);
    socketRef.current = socket;

    function onConnect() { setIsConnected(true); }
    function onDisconnect() { setIsConnected(false); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // If already connected (reconnect scenario)
    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [username]);

  /**
   * Subscribe to a socket event. Returns an unsubscribe function.
   */
  const on = useCallback((event, handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);

  /**
   * Emit a socket event. Supports acknowledgment callbacks.
   */
  const emit = useCallback((event, data, ack) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      console.warn(`[useSocket] Cannot emit "${event}" — not connected.`);
      return;
    }
    if (typeof ack === 'function') {
      socket.emit(event, data, ack);
    } else {
      socket.emit(event, data);
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectSocket();
    setIsConnected(false);
    socketRef.current = null;
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    on,
    emit,
    disconnect,
  };
}
