/**
 * client/src/context/PhysicsContext.jsx
 * ────────────────────────────────────────────────────────
 * Provides the Matter.js engine instance and control
 * methods to any descendant component via React context.
 *
 * This avoids prop-drilling engine refs through the
 * entire component tree — the toolbar, analytics panel,
 * and canvas all need access.
 * ────────────────────────────────────────────────────────
 */

import React, { createContext, useContext } from 'react';

const PhysicsContext = createContext(null);

/**
 * Provider component — wraps children with engine access.
 * The value is typically the return object from usePhysicsEngine().
 */
export function PhysicsProvider({ value, children }) {
  return (
    <PhysicsContext.Provider value={value}>
      {children}
    </PhysicsContext.Provider>
  );
}

/**
 * Consumer hook — pull the engine context from anywhere.
 */
export function usePhysics() {
  const ctx = useContext(PhysicsContext);
  if (!ctx) {
    throw new Error('usePhysics() must be used within a <PhysicsProvider>');
  }
  return ctx;
}
