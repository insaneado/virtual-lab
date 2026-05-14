/**
 * server/src/services/conflictResolver.js
 * ────────────────────────────────────────────────────────
 * Handles ownership locking and last-write-wins conflict
 * resolution for simultaneous body edits.
 *
 * The ownership model is simple:
 *  - When a user grabs a body (mousedown), the client
 *    sends body:claim → the server records the lock.
 *  - Other clients see the body as "claimed" and skip
 *    local edits to it.
 *  - On mouseup, the client sends body:release → lock
 *    is cleared.
 *  - If a client disconnects while holding a lock, the
 *    disconnect handler calls releaseAll().
 *
 * This is stored entirely in-memory. We don't need to
 * persist locks — they're per-session artifacts.
 * ────────────────────────────────────────────────────────
 */

class ConflictResolver {
  constructor() {
    // Map<roomCode, Map<bodyId, { socketId, username, claimedAt }>>
    this._locks = new Map();
  }

  /**
   * Initialize tracking for a new room.
   */
  initRoom(roomCode) {
    if (!this._locks.has(roomCode)) {
      this._locks.set(roomCode, new Map());
    }
  }

  /**
   * Attempt to claim exclusive control of a body.
   * Returns true if the claim succeeded, false if another user holds it.
   */
  claim(roomCode, bodyId, socketId, username) {
    const roomLocks = this._locks.get(roomCode);
    if (!roomLocks) return false;

    const existing = roomLocks.get(bodyId);

    // Already locked by someone else
    if (existing && existing.socketId !== socketId) {
      return false;
    }

    roomLocks.set(bodyId, { socketId, username, claimedAt: Date.now() });
    return true;
  }

  /**
   * Release a specific body lock.
   */
  release(roomCode, bodyId, socketId) {
    const roomLocks = this._locks.get(roomCode);
    if (!roomLocks) return;

    const existing = roomLocks.get(bodyId);

    // Only the holder can release (or if the lock doesn't exist, no-op)
    if (existing && existing.socketId === socketId) {
      roomLocks.delete(bodyId);
    }
  }

  /**
   * Release all locks held by a specific socket.
   * Called on disconnect to prevent orphaned locks.
   * Returns an array of bodyIds that were released.
   */
  releaseAll(roomCode, socketId) {
    const roomLocks = this._locks.get(roomCode);
    if (!roomLocks) return [];

    const released = [];
    for (const [bodyId, lock] of roomLocks) {
      if (lock.socketId === socketId) {
        roomLocks.delete(bodyId);
        released.push(bodyId);
      }
    }
    return released;
  }

  /**
   * Check who (if anyone) has a lock on a body.
   */
  getOwner(roomCode, bodyId) {
    const roomLocks = this._locks.get(roomCode);
    if (!roomLocks) return null;
    return roomLocks.get(bodyId) || null;
  }

  /**
   * Get all current locks in a room (for debug / UI display).
   */
  getRoomLocks(roomCode) {
    const roomLocks = this._locks.get(roomCode);
    if (!roomLocks) return {};
    return Object.fromEntries(roomLocks);
  }

  /**
   * Tear down tracking for a room.
   */
  destroyRoom(roomCode) {
    this._locks.delete(roomCode);
  }
}

// Singleton — one resolver instance shared across all socket handlers
module.exports = new ConflictResolver();
