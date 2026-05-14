/**
 * client/src/context/RoomContext.jsx
 * ────────────────────────────────────────────────────────
 * Manages collaborative room state — current room code,
 * participant list, and the user's own identity.
 * ────────────────────────────────────────────────────────
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

const RoomContext = createContext(null);

export function RoomProvider({ children }) {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isInRoom, setIsInRoom] = useState(false);

  const joinRoom = useCallback((code, participantList) => {
    setRoomCode(code);
    setParticipants(participantList || []);
    setIsInRoom(true);
  }, []);

  const leaveRoom = useCallback(() => {
    setRoomCode(null);
    setParticipants([]);
    setIsInRoom(false);
  }, []);

  const updateParticipants = useCallback((list) => {
    setParticipants(list || []);
  }, []);

  const value = {
    username,
    setUsername,
    roomCode,
    participants,
    isInRoom,
    joinRoom,
    leaveRoom,
    updateParticipants,
  };

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) {
    throw new Error('useRoom() must be used within a <RoomProvider>');
  }
  return ctx;
}
